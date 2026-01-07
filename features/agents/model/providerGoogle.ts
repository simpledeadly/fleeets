import { ProviderResult } from './types'
import { normalizeAIResponse } from './normalizer'

export async function callGoogle(
  model: string,
  system: string,
  prompt: string
): Promise<ProviderResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 1,
        },
      }),
    }
  )

  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const text = data.candidates[0].content.parts[0].text
  return {
    output: normalizeAIResponse(text),
    tokens: {
      input: data.usageMetadata?.promptTokenCount || 0,
      output: data.usageMetadata?.candidatesTokenCount || 0,
    },
    raw_text: text,
    finish_reason:
      (data.candidates[0].finishReason?.toLowerCase() as any) || 'stop',
  }
}
