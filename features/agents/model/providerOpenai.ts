import OpenAI from 'openai'
import { ProviderResult } from './types'
import { normalizeAIResponse } from './normalizer'

export async function callOpenAICompatible(
  config: any,
  system: string,
  prompt: string
): Promise<ProviderResult> {
  const client = new OpenAI({
    apiKey:
      config.provider === 'groq'
        ? process.env.GROQ_API_KEY
        : process.env.OPENROUTER_API_KEY,
    baseURL:
      config.provider === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : 'https://openrouter.ai/api/v1',
  })

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: system + '\nIMPORTANT: Return valid JSON.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  })

  // ЛОГИРУЕМ ВСЁ ЧТО ПРИШЛО
  console.log('--- [DEBUG: OPENAI RAW RESPONSE] ---')
  console.dir(completion, { depth: null })

  const choice = completion.choices[0]
  const raw_text = choice.message.content || '{}'

  return {
    output: normalizeAIResponse(raw_text),
    tokens: {
      input: completion.usage?.prompt_tokens || 0,
      output: completion.usage?.completion_tokens || 0,
    },
    raw_text,
    finish_reason: (choice.finish_reason as any) || 'stop',
  }
}
