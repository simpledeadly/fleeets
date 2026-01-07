import { createAiClient } from '@/lib/ai/client'
import { ProviderResult } from './types'
import { normalizeAIResponse } from './normalizer'

export async function callOpenAICompatible(
  config: any,
  system: string,
  prompt: string,
  userId: string
): Promise<ProviderResult> {
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
      { role: 'system', content: system + '\nIMPORTANT: Return JSON.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 1
  })

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
