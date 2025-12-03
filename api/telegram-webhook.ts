// api/telegram-webhook.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAuthUrl = process.env.SUPABASE_AUTH_FUNCTION_URL // URL старой функции Supabase

const supabase = createClient(supabaseUrl, supabaseKey)

export const config = {
  maxDuration: 60,
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(200).send('OK')

  const { message } = req.body
  if (!message) return res.status(200).send('No message')

  const chatId = message.chat.id
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  // === ЛОГИКА ДИСПЕТЧЕРА ===

  // 1. Если это НЕ голосовое (например /start или текст), отправляем в Supabase (чтобы работал вход)
  if (!message.voice) {
    console.log('Text message detected, proxying to Supabase Auth...')

    if (!supabaseAuthUrl) {
      console.error('SUPABASE_AUTH_FUNCTION_URL not set')
      // Пытаемся ответить юзеру, что сервис временно недоступен
      await sendMessage(chatId, botToken, '⚠️ Техническая настройка. Авторизация скоро вернется.')
      return res.status(200).send('Auth URL not configured')
    }

    try {
      // Проксируем запрос в Supabase как есть
      await fetch(supabaseAuthUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      })
      return res.status(200).send('Proxied to Supabase')
    } catch (e) {
      console.error('Proxy error:', e)
      return res.status(200).send('Proxy error')
    }
  }

  // === ЛОГИКА ГОЛОСОВЫХ (Vercel) ===

  console.log('Voice message detected, processing...')
  const groqKey = process.env.GROQ_API_KEY

  if (!botToken || !groqKey) {
    console.error('Missing keys')
    return res.status(500).json({ error: 'Config error' })
  }

  try {
    // 1. Получаем файл
    const fileId = message.voice.file_id
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
    const fileData = await fileRes.json()

    if (!fileData.ok) throw new Error('Telegram GetFile Error')
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`

    // 2. Whisper (Transcribe)
    const audioBlob = await fetch(fileUrl).then((r) => r.blob())
    const formData = new FormData()
    formData.append('file', audioBlob, 'voice.ogg')
    formData.append('model', 'whisper-large-v3') // Или whisper-large-v3-turbo (быстрее)

    const transResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
    })

    const transJson = await transResponse.json()
    if (!transResponse.ok) throw new Error(`Groq Whisper Error: ${JSON.stringify(transJson)}`)

    const transcribedText = transJson.text
    console.log('Transcribed:', transcribedText)

    if (!transcribedText || transcribedText.trim().length < 2) {
      await sendMessage(chatId, botToken, '🤔 Не удалось разобрать слова. Попробуйте еще раз.')
      return res.status(200).send('Empty transcription')
    }

    // 3. Llama (Structure)
    // Я упростил промпт и добавил json_object, чтобы избежать ошибки
    const completionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Analyze the user's text. Extract tasks, ideas, or notes.
            Return JSON ONLY. Format:
            {
              "summary": "Short summary",
              "items": [
                { "type": "task", "content": "Task text", "tags": ["tag1"] }
              ]
            }`,
          },
          { role: 'user', content: transcribedText },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    const completionJson = await completionResponse.json()

    if (!completionResponse.ok) {
      console.error('Groq Llama Error:', completionJson)
      throw new Error('Groq LLM API Failed')
    }

    const content = completionJson.choices?.[0]?.message?.content
    if (!content) throw new Error('LLM returned empty content')

    let structuredData
    try {
      structuredData = JSON.parse(content)
    } catch (e) {
      console.error('JSON Parse Error:', content)
      throw new Error('Failed to parse JSON from LLM')
    }

    // 4. Save to DB
    const { error } = await supabase.from('inbox').insert({
      telegram_chat_id: chatId,
      raw_text: transcribedText,
      structured_data: structuredData,
      status: 'new',
    })

    if (error) {
      console.error('Supabase Insert Error:', error)
      throw error
    }

    // 5. Notify User
    await sendMessage(chatId, botToken, `✅ Сохранено:\n"${transcribedText}"`)

    return res.status(200).json({ success: true })
  } catch (err: any) {
    console.error('Global Handler Error:', err)
    await sendMessage(chatId, botToken, `❌ Ошибка: ${err.message || 'Unknown error'}`)
    return res.status(200).json({ error: err.message })
  }
}

// Вспомогательная функция отправки
async function sendMessage(chatId: any, token: any, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  })
}
