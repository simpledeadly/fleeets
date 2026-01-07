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

    const rawActions = parsed.actions || parsed.commands || []

    return {
      thought: parsed.thought || '',
      content: String(
        baseContent || (typeof parsed === 'string' ? parsed : '')
      ),
      technical_log: parsed.technical_log || 'OK',
      commands: rawActions.map((c: any) => {
        const rawTool = String(c.tool || c.action || '').toUpperCase()

        let finalDomain = (c.domain || c.type || 'database').toLowerCase()
        let finalTool = rawTool

        if (rawTool.includes(':')) {
          const [d, t] = rawTool.split(':')
          finalDomain = d.toLowerCase()
          finalTool = t
        }

        return {
          domain: finalDomain as any,
          tool: finalTool,
          payload: c.payload || {},
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
