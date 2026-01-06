'use server'

import { createAdminClient } from '../../lib/supabase/admin'

// Цены (за 1 млн токенов ИЛИ за 1 минуту аудио)
const PRICING = {
  'openai/text-embedding-3-small': {
    input: 0.02,
    output: 0,
    unit: '1M_tokens',
  }, // https://openrouter.ai/openai/text-embedding-3-small
  'meta-llama/llama-3.1-8b-instruct': {
    input: 0.02,
    output: 0.03,
    unit: '1M_tokens',
  }, // https://openrouter.ai/meta-llama/llama-3.1-8b-instruct
  'meta-llama/llama-3.3-70b-instruct': {
    input: 0.1,
    output: 0.32,
    unit: '1M_tokens',
  }, // https://openrouter.ai/meta-llama/llama-3.3-70b-instruct
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08, unit: '1M_tokens' }, // https://console.groq.com/docs/model/llama-3.1-8b-instant
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79, unit: '1M_tokens' }, // https://console.groq.com/docs/model/llama-3.3-70b-versatile
  'whisper-large-v3': { input: 0.002, output: 0, unit: 'minute' }, // https://console.groq.com/docs/model/whisper-large-v3
}

type ModelName = keyof typeof PRICING | string

export interface UsageParams {
  userId: string
  model: ModelName
  action: string
  inputTokens?: number
  outputTokens?: number
  seconds?: number
}

export async function logTokenUsage({
  userId,
  model,
  action,
  inputTokens = 0,
  outputTokens = 0,
  seconds = 0,
}: UsageParams) {
  const supabase = await createAdminClient()

  let cost = 0

  if (model in PRICING) {
    const price = PRICING[model as keyof typeof PRICING]

    if (price.unit === '1M_tokens') {
      cost =
        (inputTokens * price.input + outputTokens * price.output) / 1_000_000
    } else if (price.unit === 'minute') {
      // Цена за минуту * количество минут
      cost = (seconds / 60) * price.input
    }
  }

  const finalInput = seconds > 0 ? seconds : inputTokens

  const { error } = await supabase.from('usage_logs').insert({
    user_id: userId,
    action: action,
    model: model,
    input_tokens: Math.round(finalInput),
    output_tokens: outputTokens,
    cost_usd: cost,
  })

  if (error) console.error('Log error:', error)
}
