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
  const toolsStr =
    perms.tools?.length > 0
      ? perms.tools.map((p: string) => p.toUpperCase()).join(', ')
      : ''

  const systemPrompt = ADAPTER_POLICY.prompts.system_template(
    finalAgent.system_prompt,
    userPrefs,
    projectContext,
    toolsStr
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

  const finalResult: AgentSessionResult = {
    ...res.output,
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
