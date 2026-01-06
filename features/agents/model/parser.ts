/* eslint-disable @typescript-eslint/no-unused-vars */
// features/agents/model/parser.ts
export function safeJsonParse(raw: string) {
  if (!raw) throw new Error('AI_EMPTY_RESPONSE')

  try {
    // Чистим ответ от markdown-оберток ИИ
    const cleanJson = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(cleanJson)

    if (!parsed.intent) throw new Error('MISSING_INTENT')
    return parsed
  } catch (e) {
    console.error('Parse Error. Raw content:', raw)
    throw new Error('INVALID_JSON_STRUCTURE')
  }
}
