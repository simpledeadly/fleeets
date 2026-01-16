// features/agents/model/executor.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { AGENT_TOOLS } from './registry'
import { ExecutionTrace, AgentCommand } from './types'

export async function executeCommands(
  supabase: SupabaseClient,
  userId: string,
  commands: AgentCommand[],
  perms: string[],
  isTest: boolean,
  context?: any
): Promise<ExecutionTrace[]> {
  const trace: ExecutionTrace[] = []
  const upPerms = perms.map((p) => p.toUpperCase())

  let lastSystemOutput: any = null

  for (const cmd of commands) {
    const toolId = `${cmd.domain}:${cmd.tool}`.toUpperCase()
    const baseToolName = cmd.tool.includes(':')
      ? cmd.tool.split(':')[1].toUpperCase()
      : cmd.tool.toUpperCase()
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

    const toolDef = AGENT_TOOLS[baseToolName]
    if (!toolDef && cmd.domain !== 'ui') {
      trace.push({
        tool: cmd.tool,
        domain: cmd.domain,
        status: 'error',
        input_payload: cmd.payload,
        error_details: `Tool ${cmd.tool} not found in registry`,
      })
      continue
    }

    try {
      // Валидация схемы Zod перед запуском
      if (toolDef && toolDef.schema) toolDef.schema.parse(cmd.payload)

      let output_data: any = null
      let status: any = 'success'

      // Проверка на необходимость подтверждения
      // 1. Либо инструмент помечен как требующий подтверждения в реестре
      // 2. Либо у агента в настройках включена принудительная проверка для всех действий
      const needsConfirmation =
        context?.requiresConfirmation === undefined ||
        context?.requiresConfirmation === null
          ? !!toolDef?.requiresConfirmation
          : !!context?.requiresConfirmation

      if (needsConfirmation && !context?.forceExecute) {
        status = 'pending'
        output_data = {
          message: 'Awaiting user confirmation',
          preview: cmd.payload,
        }
      } else {
        if (cmd.domain === 'database') {
          if (isTest) {
            status = 'mocked'
          } else {
            output_data = await toolDef.handler(
              supabase,
              userId,
              cmd.payload,
              context
            )
            if (output_data && 'error' in output_data && output_data.error) {
              throw new Error(output_data.error.message)
            }
          }
        } else if (cmd.domain === 'system') {
          output_data = await toolDef.handler(
            supabase,
            userId,
            cmd.payload,
            context
          )
          lastSystemOutput = output_data
        } else if (cmd.domain === 'ui') {
          status = 'success'
          output_data = lastSystemOutput || cmd.payload
        }
      }

      trace.push({
        ...cmd,
        tool: toolDef ? toolDef.id : cmd.tool,
        status,
        input_payload: cmd.payload,
        output_data,
      })
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
