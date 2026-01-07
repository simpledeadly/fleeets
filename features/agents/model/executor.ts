// features/agents/model/executor.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { DATABASE_TOOLS, SYSTEM_TOOLS, TOOL_SCHEMAS } from './registry'
import { ExecutionTrace, AgentCommand } from './types'

export async function executeCommands(
  supabase: SupabaseClient,
  userId: string,
  commands: AgentCommand[],
  perms: string[],
  isTest: boolean
): Promise<ExecutionTrace[]> {
  const trace: ExecutionTrace[] = []
  const upPerms = perms.map((p) => p.toUpperCase())

  for (const cmd of commands) {
    const toolId = `${cmd.domain}:${cmd.tool}`.toUpperCase()
    const isAllowed = upPerms.includes(toolId)

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
      // Валидация схемы Zod перед запуском
      const schema = (TOOL_SCHEMAS as any)[cmd.tool.toUpperCase()]
      if (schema) schema.parse(cmd.payload)

      let output_data: any = null
      let status: any = 'success'

      if (cmd.domain === 'database') {
        if (isTest) {
          status = 'mocked'
        } else {
          const handler = (DATABASE_TOOLS as any)[cmd.tool.toUpperCase()]
          if (!handler) throw new Error(`DB Tool ${cmd.tool} not found`)
          const res = await handler(supabase, userId, cmd.payload)
          if (res.error) throw new Error(res.error.message)
          output_data = res.data || res
        }
      } else if (cmd.domain === 'system') {
        const handler = (SYSTEM_TOOLS as any)[cmd.tool.toUpperCase()]
        if (!handler) throw new Error(`System tool ${cmd.tool} not found`)
        output_data = await handler(supabase, userId, cmd.payload)
      } else if (cmd.domain === 'ui') {
        status = 'success'
        output_data = { rendered: true }
      }

      trace.push({ ...cmd, status, input_payload: cmd.payload, output_data })
    } catch (e: any) {
      trace.push({
        ...cmd,
        status: 'error',
        input_payload: cmd.payload,
        error_details: e.message,
      })
    }
  }
  return trace
}
