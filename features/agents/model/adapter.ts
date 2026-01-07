// features/agents/model/adapter.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { callGoogle } from './providerGoogle'
import { callOpenAICompatible } from './providerOpenai'
import { AgentSessionResult, AgentRunContext } from './types'
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

  // 1. Финансовый контроль
  await validateDailyBudget(
    supabase,
    userId,
    ADAPTER_POLICY.budget.daily_limit_usd
  )

  // 2. Получение агента и разрешений
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()
  const finalAgent =
    isTest && context.agentOverride
      ? { ...agent, ...context.agentOverride }
      : agent
  if (!finalAgent) throw new Error('AGENT_NOT_FOUND')
  const perms = finalAgent.model_settings?.permissions || { tools: [] }

  // 3. Сбор контекста и сборка промпта через Policy
  const { userPrefs, projectContext } = await gatherContext(
    supabase,
    userId,
    agentId,
    context,
    perms
  )
  console.log('🔍 [DEBUG] Perms from DB:', perms.tools)

  // 1. Получаем список UI компонентов
  const uiCapabilities = ADAPTER_POLICY.get_ui_capabilities(perms.tools || [])
  console.log('🔍 [DEBUG] UI Capabilities found:', uiCapabilities.length)

  // 2. Системные инструменты (RAG, Reports)
  const systemTools = perms.tools
    .filter((t: string) => t.startsWith('system:'))
    .join(', ')

  // 3. Формируем ПОДРОБНОЕ описание для промпта
  const toolsParts = []
  if (systemTools) toolsParts.push(`SYSTEM TOOLS: ${systemTools}`)
  if (uiCapabilities.length > 0) {
    const uiDesc = uiCapabilities
      .map(
        (t) =>
          `- ID: ${t.id.toUpperCase()}\n  DESCRIPTION: ${
            t.description
          }\n  EXPECTED PAYLOAD: ${t.schema}`
      )
      .join('\n')
    toolsParts.push(`UI COMPONENTS:\n${uiDesc}`)
  }

  // Если есть БД инструменты, добавим и их
  const dbTools = perms.tools.filter((t: string) => t.startsWith('database:'))
  if (dbTools.length > 0)
    toolsParts.push(`DATABASE TOOLS: ${dbTools.join(', ')}`)

  const toolsStr = toolsParts.join('\n\n')
  console.log('🚀 [DEBUG] Final tools string weight:', toolsStr.length)

  // 4. Сборка промпта
  const systemPrompt = ADAPTER_POLICY.prompts.system_template(
    finalAgent.system_prompt,
    userPrefs,
    projectContext,
    toolsStr,
    currentDate
  )

  // 4. Вызов ИИ
  const res =
    finalAgent.model_settings.provider === 'google'
      ? await callGoogle(
          finalAgent.model_settings.model,
          systemPrompt,
          context.query
        )
      : await callOpenAICompatible(
          finalAgent.model_settings,
          systemPrompt,
          context.query
        )

  // 5. Исполнение команд и логирование
  const trace = await executeCommands(
    supabase,
    userId,
    res.output.commands,
    perms.tools || [],
    isTest
  )
  const usage = calculateUsage(finalAgent.model_settings.model, res.tokens)

  const finalContent =
    res.output.content ||
    (trace.length > 0
      ? `Выполняю команды: ${trace.map((t) => t.tool).join(', ')}`
      : '')

  const finalResult: AgentSessionResult = {
    ...res.output,
    content: finalContent,
    usage,
    execution_trace: trace,
    finish_reason: res.finish_reason,
    debug: {
      full_system_prompt: systemPrompt,
      full_user_prompt: context.query,
      raw_ai_response: res.raw_text,
      total_duration_ms: Date.now() - start,
      breakdown: calculateBreakdown(
        finalAgent,
        { manifesto: userPrefs },
        projectContext,
        toolsStr,
        context.query,
        res.tokens.input
      ),
    },
  }

  await agentLogger.commit(userId, agentId, finalAgent, finalResult, isTest)
  return finalResult
}
