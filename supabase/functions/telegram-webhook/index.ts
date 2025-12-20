// supabase/functions/telegram-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getEmbedding, logEdgeUsage } from '../_shared/analytics.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const update = await req.json()
    const message = update.message
    if (!message) return new Response('OK')

    const chatId = message.chat.id
    const telegramUserId = message.from.id

    // ==========================================
    // 1. ГАРАНТИРОВАННАЯ РЕГИСТРАЦИЯ / АВТОРИЗАЦИЯ
    // ==========================================
    // Мы делаем это для КАЖДОГО сообщения, чтобы починить "потерянных" юзеров

    const email = `${telegramUserId}@telegram.fleeets.app`
    const password = `tg_${telegramUserId}_${SUPABASE_SERVICE_ROLE_KEY}`
    let userId = null

    // А. Пробуем найти профиль по telegram_id (Самый быстрый способ)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('telegram_id', telegramUserId)
      .single()

    if (existingProfile) {
      userId = existingProfile.id
    } else {
      // Б. Профиля нет? Значит надо регистрировать или чинить связь.
      // Пробуем войти через Auth (Shadow Login)
      const { data: authData, error: signInError } =
        await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        })

      let userUser = authData.user

      if (signInError) {
        // Юзера нет в Auth -> Создаем
        console.log(`Creating new user for ${telegramUserId}`)
        const { data: newUser, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              telegram_id: telegramUserId,
              first_name: message.from.first_name,
              username: message.from.username,
            },
          })
        if (createError) {
          console.error('Create User Error:', createError)
          // Если ошибка "User already exists", но signIn не прошел - значит какой-то рассинхрон.
          // Но обычно мы сюда не попадем.
        }
        userUser = newUser.user
      }

      if (userUser) {
        userId = userUser.id
        // ВАЖНО: Принудительно прописываем telegram_id в профиль
        // (на случай если триггер сработал, но поле пустое)
        await supabaseAdmin
          .from('profiles')
          .update({ telegram_id: telegramUserId })
          .eq('id', userId)
      }
    }

    if (!userId) {
      await sendMessage(
        chatId,
        '❌ Критическая ошибка авторизации. Напишите админу.'
      )
      return new Response('OK')
    }

    // ==========================================
    // 2. ОБРАБОТКА КОМАНД (/start)
    // ==========================================
    const text = message.text || message.caption || ''

    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const sessionId = parts[1] // Код для веб-входа

      if (sessionId) {
        // Логика веб-входа (QR)
        const { data: sessionData } =
          await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
          })
        if (sessionData.session) {
          await supabaseAdmin.from('auth_sessions').upsert({
            id: sessionId,
            status: 'success',
            tokens: {
              access_token: sessionData.session.access_token,
              refresh_token: sessionData.session.refresh_token,
              user: sessionData.user,
            },
          })
          await sendMessage(chatId, `✅ Вы успешно вошли в веб-версию!`)
        } else {
          await sendMessage(chatId, `❌ Ошибка генерации токена.`)
        }
      } else {
        // Просто старт
        await sendMessage(
          chatId,
          `👋 Привет! Я Fleeets.\n\nЯ запомнил тебя. Теперь можешь писать задачи, кидать голосовые или фото.\n\nПопробуй написать: "Купить молоко"`
        )
      }
      return new Response('OK')
    }

    // ==========================================
    // 3. ОБРАБОТКА ГОЛОСОВЫХ (VOICE)
    // ==========================================
    if (message.voice) {
      await sendTypingAction(chatId)
      await sendMessage(chatId, '👂 Слушаю и обрабатываю...')

      const fileId = message.voice.file_id
      const fileRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
      )
      const fileJson = await fileRes.json()

      if (!fileJson.ok) throw new Error('TG GetFile failed')
      const tgFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileJson.result.file_path}`

      // Whisper (OpenRouter или Groq)
      const audioBlob = await fetch(tgFileUrl).then((r) => r.blob())
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice.ogg')
      // Если OpenRouter: 'openai/whisper-large-v3-turbo', Если Groq: 'whisper-large-v3'
      // Проверь какой ключ ты используешь!
      formData.append('model', 'whisper-large-v3')

      // URL меняем в зависимости от того, чей ключ (Groq или OpenRouter)
      const apiUrl = GROQ_API_KEY.startsWith('gsk_')
        ? 'https://api.groq.com/openai/v1/audio/transcriptions'
        : 'https://openrouter.ai/api/v1/audio/transcriptions'

      const transRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: formData,
      })

      const transData = await transRes.json()
      const transcribedText = transData.text

      if (!transcribedText) {
        await sendMessage(chatId, '🤔 Тишина...')
        return new Response('OK')
      } else {
        logEdgeUsage({
          userId, // ID юзера у нас есть
          model: 'whisper-large-v3',
          action: 'telegram_voice',
          seconds: message.voice.duration || 0, // Телеграм дает длительность!
        })
      }

      // 2. Сохраняем с вектором
      await supabaseAdmin.from('items').insert({
        user_id: userId,
        content: transcribedText,
        raw_content: transcribedText,
        type: 'task',
        status: 'inbox',
        scope: 'fleeets',
        metadata: { source: 'voice' },
      })

      await sendMessage(chatId, `✅ Задача:\n"${transcribedText}"`)
      return new Response('OK')
    }

    // ==========================================
    // 4. ОБРАБОТКА ТЕКСТА (DEBUG VERSION)
    // ==========================================

    const { data, error } = await supabaseAdmin
      .from('items')
      .insert({
        user_id: userId,
        content: text,
        raw_content: text,
        type: 'note',
        status: 'inbox',
        scope: 'fleeets',
        metadata: { source: 'telegram' },
      })
      .select()

    if (error) {
      console.error('DB Insert Error:', error)
      // Бот напишет ошибку прямо в чат
      await sendMessage(
        chatId,
        `❌ Ошибка записи в БД:\nCode: ${error.code}\nMsg: ${error.message}\nDetails: ${error.details}`
      )
    } else {
      await setReaction(chatId, message.message_id, '👍')
      // await sendMessage(chatId, '✅ Записано (Debug)') // Раскомментируй, если реакцию не видно
    }

    return new Response('OK')
  } catch (err) {
    console.error('WEBHOOK ERROR:', err)
    // Можно отправить юзеру отладочное сообщение, если хочешь
    // await sendMessage(message.chat.id, `Bug: ${err.message}`)
    return new Response('OK')
  }
})

// Хелперы
async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}
async function sendTypingAction(chatId: number) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  })
}
async function setReaction(chatId: number, messageId: number, emoji: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMessageReaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reaction: [{ type: 'emoji', emoji }],
    }),
  })
}
