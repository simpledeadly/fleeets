import { createAdminClient } from '@/lib/supabase/admin'
import { callGoogle } from './providerGoogle'
import { callOpenAICompatible } from './providerOpenai'
import { DATABASE_TOOLS } from './registry'
import {
  AgentSessionResult,
  ExecutionTrace,
  AgentUsage,
  AgentRunContext,
} from './types'
import { PRICING } from './constants'

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

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()
  if (!agent) throw new Error('Agent not found')

  const systemPrompt = `${agent.system_prompt}\n\nCONTEXT: ${context.scope}`

  const providerRes =
    agent.model_settings.provider === 'google'
      ? await callGoogle(
          agent.model_settings.model,
          systemPrompt,
          context.query
        )
      : await callOpenAICompatible(
          agent.model_settings,
          systemPrompt,
          context.query,
          userId
        )

  const trace: ExecutionTrace[] = []
  const perms = agent.model_settings.permissions?.tools || []

  for (const cmd of providerRes.output.commands) {
    const toolId = `${cmd.domain}:${cmd.tool}`
    if (!perms.includes(toolId)) {
      trace.push({
        ...cmd,
        status: 'blocked',
        input_payload: cmd.payload,
        error_details: 'No permission',
      })
      continue
    }

    try {
      if (isTest) {
        trace.push({ ...cmd, status: 'mocked', input_payload: cmd.payload })
      } else if (cmd.domain === 'database') {
        const handler = (DATABASE_TOOLS as any)[cmd.tool]
        const res = await handler(supabase, userId, cmd.payload)
        trace.push({
          ...cmd,
          status: res.error ? 'error' : 'success',
          input_payload: cmd.payload,
          error_details: res.error?.message,
        })
      }
    } catch (e: any) {
      trace.push({
        ...cmd,
        status: 'error',
        input_payload: cmd.payload,
        error_details: e.message,
        validation_error: e.name === 'ZodError',
      })
    }
  }

  const p = PRICING[agent.model_settings.model] || { input: 0, output: 0 }
  const usage: AgentUsage = {
    model: agent.model_settings.model,
    input_tokens: providerRes.tokens.input,
    output_tokens: providerRes.tokens.output,
    total_tokens: providerRes.tokens.input + providerRes.tokens.output,
    cost_usd:
      (providerRes.tokens.input * p.input +
        providerRes.tokens.output * p.output) /
      1000000,
  }

  return {
    ...providerRes.output,
    usage,
    execution_trace: trace,
    finish_reason: providerRes.finish_reason,
    debug: {
      full_system_prompt: systemPrompt,
      full_user_prompt: context.query,
      raw_ai_response: providerRes.raw_text,
      total_duration_ms: Date.now() - start,
    },
  }
}
