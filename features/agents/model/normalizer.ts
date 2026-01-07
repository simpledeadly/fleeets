import { UnifiedAgentResponse, AgentAction } from './types'
import { LEGACY_INTENT_MAP } from './constants'

export function normalizeAIResponse(text: string): UnifiedAgentResponse {
  try {
    const cleanJson = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(cleanJson)
    const actions: AgentAction[] = parsed.actions || []

    if (actions.length === 0 && (parsed.intent || parsed.action)) {
      const tool = String(parsed.intent || parsed.action).toUpperCase()
      actions.push({
        type: 'database',
        tool: LEGACY_INTENT_MAP[tool] || tool,
        payload: parsed.data || parsed.tasks || parsed.content || {},
      })
    }

    return {
      thought: parsed.thought || '',
      content: parsed.content || parsed.message || '',
      log_message: parsed.log_message || 'OK',
      actions: actions.map((a) => ({
        type: a.type || 'database',
        tool: a.tool?.toUpperCase() || 'UPDATE_ITEM',
        payload: a.payload || {},
      })),
    }
  } catch (e) {
    return { content: text, actions: [], log_message: `PARSE_ERROR: ${e}` }
  }
}
