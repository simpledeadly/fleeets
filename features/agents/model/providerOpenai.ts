import { createAiClient } from '@/lib/ai/client'
import { RawAIResult } from './types'
import { normalizeAIResponse } from './normalizer'

export async function callOpenAICompatible(
  config: any,
  system: string,
  prompt: string,
  userId: string
): Promise<RawAIResult> {
  const client = createAiClient({
    apiKey:
      config.provider === 'groq'
        ? process.env.GROQ_API_KEY
        : process.env.OPENROUTER_API_KEY,
    baseURL:
      config.provider === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : 'https://openrouter.ai/api/v1',
    userId,
    action: `agent_${config.provider}`,
  })

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      // Фикс ошибки 400: слово JSON обязательно в промпте
      { role: 'system', content: system + '\nInstruction: Respond with JSON.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 1,
  })

  const text = completion.choices[0].message.content || '{}'
  return {
    object: normalizeAIResponse(text),
    usage: {
      input_tokens: completion.usage?.prompt_tokens || 0,
      output_tokens: completion.usage?.completion_tokens || 0,
    },
    raw_text: text,
  }
}
