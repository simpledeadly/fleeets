// features/agents/model/adapter.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { callGoogle } from './providerGoogle'
import { callOpenAICompatible } from './providerOpenai'
import { AgentSessionResult, AgentRunContext, ExecutionTrace } from './types'
import { agentLogger } from './logger'
import { calculateUsage, calculateBreakdown } from './logic'
import { executeCommands } from './executor'
import { validateDailyBudget } from './guard'
import { ADAPTER_POLICY } from './agentPolicy'
import { gatherContext } from './contextGatherer'

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
  const { userPrefs, projectContext } = await gatherContext(
    supabase,
    userId,
    agentId,
    context,
    perms
  )

  // Подготовка описания инструментов
  const uiCapabilities = ADAPTER_POLICY.get_ui_capabilities(perms.tools || [])
  const toolsParts = []
  if (perms.tools.some((t: string) => t.startsWith('system:'))) {
    toolsParts.push(
      `SYSTEM TOOLS: ${perms.tools
        .filter((t: string) => t.startsWith('system:'))
        .join(', ')}`
    )
  }
  if (uiCapabilities.length > 0) {
    toolsParts.push(
      `UI COMPONENTS:\n${uiCapabilities
        .map(
          (t) =>
            `- ID: ${t.id.toUpperCase()}\n  DESC: ${t.description}\n  SCHEMA: ${
              t.schema
            }`
        )
        .join('\n')}`
    )
  }
  const dbTools = perms.tools.filter((t: string) => t.startsWith('database:'))
  if (dbTools.length > 0)
    toolsParts.push(`DATABASE TOOLS: ${dbTools.join(', ')}`)

  const toolsStr = toolsParts.join('\n\n')
  const systemPrompt = ADAPTER_POLICY.prompts.system_template(
    agent.system_prompt,
    userPrefs,
    projectContext,
    toolsStr,
    currentDate
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
  let accumulatedTrace: ExecutionTrace[] = []
  const totalTokens = { input: 0, output: 0 }
  let lastProviderRes: any = null

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

    // Выполняем команды
    const currentTrace = await executeCommands(
      supabase,
      userId,
      res.output.commands,
      perms.tools || [],
      isTest
    )
    accumulatedTrace = [...accumulatedTrace, ...currentTrace]

    // ПРОВЕРКА: НУЖЕН ЛИ СЛЕДУЮЩИЙ ШАГ?
    const systemResults = currentTrace.filter(
      (t) => t.domain === 'system' && t.status === 'success'
    )

    if (systemResults.length > 0 && iterations < maxIterations) {
      currentQuery += `\n\nSYSTEM_OBSERVATION: ${JSON.stringify(
        systemResults.map((r) => r.output_data)
      )}\nAnalyze this and finish.`
      continue
    }
    break // Выходим, если системных вызовов нет или лимит исчерпан
  }

  // --- СБОРКА ФИНАЛЬНОГО РЕЗУЛЬТАТА ---
  const usage = calculateUsage(agent.model_settings.model, totalTokens)
  const finalContent =
    lastProviderRes.output.content ||
    (accumulatedTrace.length > 0
      ? `Действия выполнены: ${accumulatedTrace.map((t) => t.tool).join(', ')}`
      : '')

  const finalResult: AgentSessionResult = {
    ...lastProviderRes.output,
    content: finalContent,
    usage,
    execution_trace: accumulatedTrace,
    finish_reason: lastProviderRes.finish_reason,
    debug: {
      full_system_prompt: systemPrompt,
      full_user_prompt: currentQuery, // Показывает финальный склеенный запрос
      raw_ai_response: lastProviderRes.raw_text,
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
