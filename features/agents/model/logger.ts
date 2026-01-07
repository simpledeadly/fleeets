import { SupabaseClient } from '@supabase/supabase-js'
import { AgentSessionResult } from './types'
import { PRICING } from './constants'

export const agentLogger = {
  async commit(
    supabase: SupabaseClient,
    userId: string,
    agentId: string,
    res: AgentSessionResult,
    isTest: boolean
  ) {
    const { usage, debug, execution_trace } = res

    const p = PRICING[usage.model] || { input: 0.1, output: 0.1 }
    usage.cost_usd =
      (usage.input * p.input + usage.output * p.output) / 1_000_000

    await Promise.all([
      supabase.from('usage_logs').insert({
        user_id: userId,
        model: usage.model,
        action: isTest ? 'agent_test' : 'agent_run',
        input_tokens: usage.input,
        output_tokens: usage.output,
        cost_usd: usage.cost_usd,
      }),
      supabase.from('activity_logs').insert({
        user_id: userId,
        source: 'agent_adapter',
        category: isTest ? 'agent.test' : 'agent.run',
        details: {
          agent_id: agentId,
          usage,
          trace: execution_trace,
          prompts: {
            system: debug.full_system_prompt,
            user: debug.full_user_prompt,
          },
          raw_response: debug.raw_ai_response,
          duration: debug.total_duration_ms,
        },
      }),
    ])
  },
}
