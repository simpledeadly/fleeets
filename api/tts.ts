// api/tts.ts

export const config = {
  maxDuration: 30, // Генерация аудио может занять пару секунд
}

export default async function handler(req: any, res: any) {
  // 1. CORS (чтобы фронтенд мог делать запросы)
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Обработка preflight запроса (браузер спрашивает разрешения)
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Проверка метода
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { text, voice = 'nova' } = req.body

  if (!text) {
    return res.status(400).json({ error: 'Text is required' })
  }

  // Берем ключ (проверяем оба варианта имени переменной)
  const apiKey = process.env.VSEGPT_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'Server config error: API Key missing' })
  }

  try {
    // 2. Запрос к VseGPT
    // URL взят из документации VseGPT (v1/audio/speech)
    const vsegptUrl = 'https://api.vsegpt.ru/v1/audio/speech'

    const response = await fetch(vsegptUrl, {
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
      const errorText = await response.text()
      console.error('VseGPT Error:', errorText)
      throw new Error(`TTS Provider Error: ${response.status} ${errorText}`)
    }

    // 3. Отдаем аудиофайл обратно на фронтенд
    const audioBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(audioBuffer)

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', buffer.length)
    res.status(200).send(buffer)
  } catch (error: any) {
    console.error('Handler Error:', error)
    res.status(500).json({ error: error.message || 'Error generating speech' })
  }
}
