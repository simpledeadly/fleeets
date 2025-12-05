// api/tts.ts

// ⚡️ МАГИЯ: Включаем Edge Runtime (мгновенный запуск)
export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  // CORS заголовки
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { text, voice = 'onyx' } = await req.json()

    if (!text) {
      return new Response('Text is required', { status: 400, headers: corsHeaders })
    }

    const apiKey = process.env.VSEGPT_API_KEY || process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response('API Key missing', { status: 500, headers: corsHeaders })
    }

    // Запрос к VseGPT
    const response = await fetch('https://api.vsegpt.ru/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-openai/tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(`TTS Error: ${err}`, { status: response.status, headers: corsHeaders })
    }

    // 🚀 СТРИМИНГ: Мы не ждем загрузки файла.
    // Мы берем поток (readable stream) от OpenAI и сразу отдаем его клиенту.
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
