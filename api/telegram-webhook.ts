// api/telegram-webhook.ts
import { createClient } from '@supabase/supabase-js'

// 1. Исправление ошибки с типами переменных окружения (добавили || '')
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export const config = {
  maxDuration: 60,
}

// 2. Исправление ошибки "implicitly has an 'any' type"
// Мы явно указываем any, чтобы TypeScript успокоился
export default async function handler(req: any, res: any) {
  // Проверка метода
  if (req.method !== 'POST') return res.status(200).send('OK')

  const { message } = req.body
  if (!message || !message.voice) {
    return res.status(200).send('Not a voice message')
  }

  const chatId = message.chat.id
  const fileId = message.voice.file_id

  // Берем переменные окружения
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const groqKey = process.env.GROQ_API_KEY

  if (!botToken || !groqKey) {
    console.error('Missing API keys')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    // Получаем ссылку на файл
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
    const fileData = await fileRes.json()

    if (!fileData.ok) throw new Error('Failed to get file path from Telegram')

    const filePath = fileData.result.file_path
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`

    // Скачиваем аудио
    const audioBlob = await fetch(fileUrl).then((r) => r.blob())

    // Отправляем в Groq (Whisper)
    const formData = new FormData()
    formData.append('file', audioBlob, 'voice.ogg')
    formData.append('model', 'whisper-large-v3')
    formData.append('temperature', '0')

    const transResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
    })

    const transJson = await transResponse.json()
    // 3. Исправление "error is of type unknown" (через проверку)
    if (!transResponse.ok) {
      console.error('Groq Error:', transJson)
      throw new Error(`Groq Transcription API Error: ${JSON.stringify(transJson)}`)
    }

    const transcribedText = transJson.text

    // Структурируем через Llama 3
    const completionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: `Ты — AI-ассистент. Твоя задача — извлечь из текста задачи, идеи или заметки.
            Верни ответ ТОЛЬКО в формате JSON следующей структуры:
            {
              "summary": "Краткая суть",
              "items": [
                {
                  "type": "task" | "idea" | "note",
                  "content": "Текст сущности",
                  "tags": ["тег1", "тег2"]
                }
              ]
            }
            Не пиши ничего кроме JSON.`,
          },
          {
            role: 'user',
            content: transcribedText,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    const completionJson = await completionResponse.json()
    const content = completionJson.choices?.[0]?.message?.content

    if (!content) throw new Error('Failed to get structure from LLM')

    const structuredData = JSON.parse(content)

    // Пишем в Supabase
    // ВАЖНО: убедись, что user_id не обязателен или добавь логику поиска юзера по chat_id
    const { error } = await supabase.from('inbox').insert({
      telegram_chat_id: chatId,
      raw_text: transcribedText,
      structured_data: structuredData,
      status: 'new',
    })

    if (error) throw error

    // Отвечаем в ТГ
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ Сохранено:\n${transcribedText.slice(0, 100)}...`,
        reply_to_message_id: message.message_id,
      }),
    })

    return res.status(200).json({ success: true })
  } catch (err: any) {
    // Явное указание any для ошибки
    console.error(err)
    return res.status(200).json({ error: err.message || 'Unknown error' })
  }
}
