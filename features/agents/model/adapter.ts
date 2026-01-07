import { createAdminClient } from '@/lib/supabase/admin'
import { callGoogle } from './providerGoogle'
import { callOpenAICompatible } from './providerOpenai'
import { DATABASE_TOOLS } from './registry'
import { AgentResponse, ExecutionStep, AgentUsage } from './types'
import { PRICING } from './constants'

export async function processAgentTask({
  agentId,
  userId,
  context,
  isTest = false,
}: any): Promise<AgentResponse> {
  const supabase = await createAdminClient()
  const start = Date.now()
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()
  if (!agent) throw new Error('Agent not found')

  const systemPrompt = `${agent.system_prompt}\n\nCONTEXT: ${context.scope}`
  const callParams = [
    agent.model_settings,
    systemPrompt,
    context.query,
    userId,
  ] as const

  const { object, usage, raw_text } =
    agent.model_settings.provider === 'google'
      ? await callGoogle(
          agent.model_settings.model,
          systemPrompt,
          context.query
        )
      : await callOpenAICompatible(...callParams)

  const steps: ExecutionStep[] = []
  const perms = agent.model_settings.permissions?.tools || []

  for (const act of object.actions) {
    const toolId = `${act.type}:${act.tool}`
    if (!perms.includes(toolId)) {
      steps.push({ ...act, status: 'blocked', message: 'No permission' })
      continue
    }
    if (isTest) {
      steps.push({ ...act, status: 'mocked' })
    } else if (act.type === 'database') {
      const res = await (DATABASE_TOOLS as any)[act.tool](
        supabase,
        userId,
        act.payload
      )
      steps.push({
        ...act,
        status: res.error ? 'error' : 'success',
        message: res.error?.message,
      })
    }
  }

  const p = PRICING[agent.model_settings.model] || { input: 0, output: 0 }
  const usageObj: AgentUsage = {
    model: agent.model_settings.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: usage.input_tokens + usage.output_tokens,
    cost_usd:
      (usage.input_tokens * p.input + usage.output_tokens * p.output) / 1000000,
  }

  return {
    ...object,
    usage: usageObj,
    execution_steps: steps,
    debug: {
      full_system_prompt: systemPrompt,
      full_user_prompt: context.query,
      raw_ai_response: raw_text,
      duration_ms: Date.now() - start,
    },
  }
}
