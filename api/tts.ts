// api/tts.ts
export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  const url = new URL(req.url)

  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  let text = ''
  let voice = 'onyx'

  if (req.method === 'GET') {
    text = url.searchParams.get('text') || ''
    voice = url.searchParams.get('voice') || 'onyx'
  } else if (req.method === 'POST') {
    const body = await req.json()
    text = body.text
    voice = body.voice || 'onyx'
  } else {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  if (!text) {
    return new Response('Text is required', { status: 400, headers: corsHeaders })
  }

  const apiKey = process.env.VSEGPT_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) return new Response('API Key missing', { status: 500, headers: corsHeaders })

  try {
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

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
}
