import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Цены выносим в константу
const PRICING: Record<string, any> = {
  'gemini-3-flash-preview': { input: 0.5, output: 3, unit: '1M_tokens' },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79, unit: '1M_tokens' },
}

export const logger = {
  // Логгирование траты денег/токенов
  async usage(params: {
    userId: string
    model: string
    action: string
    inputTokens: number
    outputTokens: number
  }) {
    let cost = 0
    const price = PRICING[params.model]
    if (price) {
      cost =
        (params.inputTokens * price.input +
          params.outputTokens * price.output) /
        1_000_000
    }

    return supabase.from('usage_logs').insert({
      user_id: params.userId,
      action: params.action,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_usd: cost,
    })
  },

  // Логгирование действий пользователя/агента
  async activity(params: {
    userId: string
    category: string
    source: string
    details: any
  }) {
    return supabase.from('activity_logs').insert({
      user_id: params.userId,
      source: params.source,
      category: params.category,
      details: params.details,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    })
  },
}
