import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Копия цен (да, приходится дублировать, если нет общей БД с ценами)
const PRICING: Record<string, { input: number; output: number; unit: string }> =
  {
    'openai/text-embedding-3-small': {
      input: 0.02,
      output: 0,
      unit: '1M_tokens',
    },
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79, unit: '1M_tokens' },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08, unit: '1M_tokens' },
    'whisper-large-v3': { input: 0.002, output: 0, unit: 'minute' },
  }

interface LogParams {
  userId: string
  model: string
  action: string
  inputTokens?: number
  outputTokens?: number
  seconds?: number
}

export async function logEdgeUsage({
  userId,
  model,
  action,
  inputTokens = 0,
  outputTokens = 0,
  seconds = 0,
}: LogParams) {
  let cost = 0

  if (PRICING[model]) {
    const price = PRICING[model]
    if (price.unit === '1M_tokens') {
      cost =
        (inputTokens * price.input + outputTokens * price.output) / 1_000_000
    } else if (price.unit === 'minute') {
      cost = (seconds / 60) * price.input
    }
  }

  const finalInput = seconds > 0 ? seconds : inputTokens

  // Пишем в базу (не ждем await, чтобы не тормозить бота)
  supabase
    .from('usage_logs')
    .insert({
      user_id: userId,
      action: action,
      model: model,
      input_tokens: Math.round(finalInput),
      output_tokens: outputTokens,
      cost_usd: cost,
    })
    .then(({ error }) => {
      if (error) console.error('Edge Log Error:', error)
    })
}

export async function getEmbedding(
  text: string,
  userId: string,
  source: string
) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: text.replaceAll('\n', ' '),
      }),
    })

    if (!res.ok) {
      console.error(`OpenRouter Error (${source}):`, await res.text())
      return null
    }

    const json = await res.json()

    if (json.usage) {
      await logEdgeUsage({
        userId,
        model: 'openai/text-embedding-3-small',
        action: `${source}_embedding`,
        inputTokens: json.usage.prompt_tokens,
        outputTokens: 0,
      })
    }

    return json.data?.[0]?.embedding || null
  } catch (e) {
    console.error(`Embedding Exception (${source}):`, e)
    return null
  }
}
