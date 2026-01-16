// features/agents/model/adapter.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { callGoogle } from './providerGoogle'
import { callOpenAICompatible } from './providerOpenai'
import {
  AgentSessionResult,
  AgentRunContext,
  ExecutionTrace,
  IterationLog,
} from './types'
import { agentLogger } from './logger'
import { calculateUsage, calculateBreakdown } from './logic'
import { executeCommands } from './executor'
import { validateDailyBudget } from './guard'
import { ADAPTER_POLICY } from './agentPolicy'
import { gatherContext } from './contextGatherer'
import { AGENT_TOOLS } from './registry'
import { zodToJsonSchema } from 'zod-to-json-schema'

export async function processAgentTask({
  agentId,
  userId,
  context,
  isTest = false,
}: {
  agentId: string
  userId: string
  context: AgentRunContext
  isTest?: boolean
}): Promise<AgentSessionResult> {
  const supabase = await createAdminClient()
  const start = Date.now()
  const now = new Date()
  const currentDate = now.toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  await validateDailyBudget(
    supabase,
    userId,
    ADAPTER_POLICY.budget.daily_limit_usd
  )

  const { data: agentData } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()
  const agent =
    isTest && context.agentOverride
      ? { ...agentData, ...context.agentOverride }
      : agentData
  if (!agent) throw new Error('AGENT_NOT_FOUND')

  const perms = agent.model_settings?.permissions || { tools: [] }
  const { userPrefs, projectContext, selectedItems } = await gatherContext(
    supabase,
    userId,
    agentId,
    context,
    perms
  )

  // Подготовка описания инструментов
  const uiCapabilities = ADAPTER_POLICY.get_ui_capabilities(perms.tools || [])
  const toolsParts = []

  // 1. DATABASE & SYSTEM TOOLS from unified registry
  const toolDescriptions = perms.tools
    .map((perm: string) => {
      const toolName = perm.split(':')[1]?.toUpperCase()
      const def = AGENT_TOOLS[toolName]
      if (!def) return null

      const schemaJson = zodToJsonSchema(def.schema as any)
      return `- ID: ${def.id} (Domain: ${def.domain})\n  DESC: ${
        def.description
      }\n  CONFIRMATION REQUIRED: ${!!def.requiresConfirmation}\n  SCHEMA: ${JSON.stringify(
        schemaJson
      )}`
    })
    .filter(Boolean)

  if (toolDescriptions.length > 0) {
    toolsParts.push(`AVAILABLE ACTIONS:\n${toolDescriptions.join('\n\n')}`)
  }

  // 2. UI COMPONENTS
  if (uiCapabilities.length > 0) {
    toolsParts.push(
      `UI COMPONENTS (for rich responses):\n${uiCapabilities
        .map(
          (t) =>
            `- ID: ${t.id.toUpperCase()}\n  DESC: ${
              t.description
            }\n  SCHEMA: ${JSON.stringify(t.schema)}`
        )
        .join('\n')}`
    )
  }

  const toolsStr = toolsParts.join('\n\n')
  const systemPrompt = ADAPTER_POLICY.prompts.system_template(
    agent.system_prompt,
    userPrefs,
    projectContext,
    toolsStr,
    currentDate,
    selectedItems
  )

  const agentSettings = agent.model_settings || {}
  const isAgenticEnabled =
    agentSettings.enable_agentic_loop ??
    ADAPTER_POLICY.defaults.enable_agentic_loop
  const maxIterations = isAgenticEnabled
    ? agentSettings.max_iterations || ADAPTER_POLICY.defaults.max_iterations
    : 1

  let currentQuery = context.query
  let iterations = 0
  const iterationLogs: IterationLog[] = []
  let accumulatedTrace: ExecutionTrace[] = []
  const totalTokens = { input: 0, output: 0 }
  let lastProviderRes: any = null

  // --- SHORT-CIRCUIT: Direct execution of confirmed commands ---
  if (context.forceExecute && context.predefinedCommands) {
    const currentTrace = await executeCommands(
      supabase,
      userId,
      context.predefinedCommands,
      perms.tools || [],
      isTest,
      { ...context, agentId }
    )

    const usage = calculateUsage(agent.model_settings.model, {
      input: 0,
      output: 0,
    })
    return {
      content: 'Изменения успешно применены.',
      usage,
      execution_trace: currentTrace,
      finish_reason: 'stop',
      debug: {
        total_duration_ms: Date.now() - start,
      },
    } as any
  }

  while (iterations < maxIterations) {
    iterations++

    const res =
      agent.model_settings.provider === 'google'
        ? await callGoogle(
            agent.model_settings.model,
            systemPrompt,
            currentQuery
          )
        : await callOpenAICompatible(
            agent.model_settings,
            systemPrompt,
            currentQuery
          )

    lastProviderRes = res
    totalTokens.input += res.tokens.input
    totalTokens.output += res.tokens.output

    iterationLogs.push({
      index: iterations,
      tokens: res.tokens,
      requested_tools: res.output.commands.map((c: any) => c.tool),
      finish_reason: res.finish_reason,
    })

    // Выполняем команды
    const currentTrace = await executeCommands(
      supabase,
      userId,
      res.output.commands,
      perms.tools || [],
      isTest,
      { ...context, agentId }
    )
    accumulatedTrace = [...accumulatedTrace, ...currentTrace]

    // ПРОВЕРКА: НУЖЕН ЛИ СЛЕДУЮЩИЙ ШАГ ИЛИ ОСТАНОВКА НА ПОДТВЕРЖДЕНИЕ?
    const hasPending = currentTrace.some((t) => t.status === 'pending')
    if (hasPending) break

    const systemData = currentTrace.filter(
      (t) => t.domain === 'system' && t.status === 'success'
    )

    if (systemData.length > 0 && iterations < maxIterations) {
      const observation = systemData
        .map((r) => `TOOL_RESULT [${r.tool}]: ${JSON.stringify(r.output_data)}`)
        .join('\n')

      // ВОТ ОНИ - СПЕЦИФИЧНЫЕ ИНСТРУКЦИИ
      const nextStepInstruction =
        iterations === maxIterations - 1
          ? 'Analyze this data and provide your FINAL response to the user now. Do not call more tools.'
          : 'Analyze this data. If you need more info, use tools. If not, answer the user.'

      currentQuery += `\n\nOBSERVATION:\n${observation}\n\n${nextStepInstruction}`
      continue
    }
    break // Выходим, если системных вызовов нет или лимит исчерпан
  }

  // --- СБОРКА ФИНАЛЬНОГО РЕЗУЛЬТАТА ---
  const usage = calculateUsage(agent.model_settings.model, totalTokens)
  const hasPending = accumulatedTrace.some((t) => t.status === 'pending')
  const finalContent =
    lastProviderRes.output.content ||
    (accumulatedTrace.length > 0
      ? hasPending
        ? `Требуется подтверждение для действий: ${accumulatedTrace
            .filter((t) => t.status === 'pending')
            .map((t) => t.tool)
            .join(', ')}`
        : `Действия выполнены: ${accumulatedTrace
            .map((t) => t.tool)
            .join(', ')}`
      : '')

  const finalResult: AgentSessionResult = {
    ...lastProviderRes.output,
    content: finalContent,
    usage,
    execution_trace: accumulatedTrace,
    finish_reason: lastProviderRes.finish_reason,
    debug: {
      full_system_prompt: systemPrompt,
      full_user_prompt: currentQuery,
      raw_ai_response: lastProviderRes.raw_text,
      iteration_logs: iterationLogs,
      total_duration_ms: Date.now() - start,
      breakdown: calculateBreakdown(
        agent,
        { manifesto: userPrefs },
        projectContext,
        toolsStr,
        context.query,
        totalTokens.input
      ),
    },
  }

  await agentLogger.commit(userId, agentId, agent, finalResult, isTest)
  return finalResult
}
