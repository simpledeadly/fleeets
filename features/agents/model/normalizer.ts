// features/agents/model/normalizer.ts
import { AgentOutput } from './types'

export function normalizeAIResponse(text: string): AgentOutput {
  try {
    const cleanJson = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(cleanJson)

    const baseContent = Array.isArray(parsed)
      ? parsed[0]
      : parsed.content ||
        parsed.response ||
        parsed.message ||
        parsed.answer ||
        parsed.result ||
        ''

    const rawCommands =
      parsed.actions || parsed.commands || parsed.tool_calls || []

    return {
      thought: parsed.thought || '',
      content: String(
        baseContent || (typeof parsed === 'string' ? parsed : '')
      ),
      technical_log: parsed.technical_log || 'OK',
      commands: rawCommands.map((c: any) => {
        const rawTool = String(
          c.tool || c.action || c.name || c.function?.name || ''
        ).toLowerCase()

        let domain = (c.domain || c.type || 'database').toLowerCase()
        let tool = rawTool

        if (rawTool.includes(':')) {
          const parts = rawTool.split(':')
          domain = parts[0].toLowerCase()
          tool = parts[1]
        }

        let payload =
          c.payload || c.arguments || c.args || c.parameters || c.data || {}

        // Если payload пришел строкой (бывает у некоторых моделей), парсим его
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload)
          } catch {}
        }

        return {
          domain,
          tool,
          payload,
        }
      }),
    }
  } catch (e) {
    return {
      content: text,
      commands: [],
      technical_log: `RAW_TEXT_FALLBACK: ${e}`,
    }
  }
}
