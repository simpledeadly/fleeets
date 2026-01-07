// features/agents/model/executor.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { DATABASE_TOOLS } from './registry'
import { ExecutionTrace, AgentCommand } from './types'

export async function executeCommands(
  supabase: SupabaseClient,
  userId: string,
  commands: AgentCommand[],
  perms: string[],
  isTest: boolean
): Promise<ExecutionTrace[]> {
  const trace: ExecutionTrace[] = []

  for (const cmd of commands) {
    const toolId = `${cmd.domain}:${cmd.tool}`.toUpperCase()
    const isAllowed = perms.map((p) => p.toUpperCase()).includes(toolId)

    if (!isAllowed) {
      trace.push({
        tool: cmd.tool,
        domain: cmd.domain,
        status: 'blocked',
        input_payload: cmd.payload,
        error_details: `Access denied for ${toolId}`,
      })
      continue
    }

    try {
      if (isTest) {
        trace.push({
          tool: cmd.tool,
          domain: cmd.domain,
          status: 'mocked',
          input_payload: cmd.payload,
        })
      } else if (cmd.domain === 'database') {
        const handler = (DATABASE_TOOLS as any)[cmd.tool.toUpperCase()]
        if (!handler) throw new Error(`Tool ${cmd.tool} not found`)
        const res = await handler(supabase, userId, cmd.payload)
        trace.push({
          tool: cmd.tool,
          domain: cmd.domain,
          status: res.error ? 'error' : 'success',
          input_payload: cmd.payload,
          error_details: res.error?.message,
        })
      }
    } catch (e: any) {
      trace.push({
        tool: cmd.tool,
        domain: cmd.domain,
        status: 'error',
        input_payload: cmd.payload,
        error_details: e.message,
      })
    }
  }
  return trace
}
