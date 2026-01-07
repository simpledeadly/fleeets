import { AgentOutput, AgentCommand } from './types'
import { LEGACY_INTENT_MAP } from './constants'

export function normalizeAIResponse(text: string): AgentOutput {
  try {
    const cleanJson = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(cleanJson)
    const commands: AgentCommand[] = parsed.commands || parsed.actions || []

    // Поддержка старых форматов (intent/data)
    if (commands.length === 0 && (parsed.intent || parsed.action)) {
      const tool = String(parsed.intent || parsed.action).toUpperCase()
      commands.push({
        domain: 'database',
        tool: LEGACY_INTENT_MAP[tool] || tool,
        payload: parsed.data || parsed.tasks || parsed.content || {},
      })
    }

    return {
      thought: parsed.thought || '',
      content: parsed.content || parsed.message || '',
      technical_log: parsed.technical_log || parsed.log_message || 'OK',
      commands: commands.map((c) => ({
        domain: c.domain || 'database',
        tool: c.tool?.toUpperCase() || 'UPDATE_ITEM',
        payload: c.payload || {},
      })),
    }
  } catch (e) {
    return { content: text, commands: [], technical_log: `PARSE_ERROR: ${e}` }
  }
}
