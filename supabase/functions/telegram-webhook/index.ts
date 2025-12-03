import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const update = await req.json()
    const message = update.message

    if (!message) return new Response('OK')

    const chatId = message.chat.id
    const telegramUserId = message.from.id
    const text = message.text || ''

    // === СЦЕНАРИЙ 1: ЛОГИН (/start <код>) ===
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const sessionId = parts.length > 1 ? parts[1].trim() : null

      if (!sessionId) {
        await sendMessage(
          chatId,
          "👋 Привет! Это бот Fleeets.\n\nЧтобы войти в приложение, нажмите кнопку 'Войти через Telegram' на сайте или в приложении."
        )
        return new Response('OK')
      }

      // 1. Находим или создаем пользователя
      const email = `${telegramUserId}@telegram.fleeets.app`
      const password = `tg_${telegramUserId}_${SUPABASE_SERVICE_ROLE_KEY}`

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      if (!existingUsers.users.find((u) => u.email === email)) {
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
      }

      // 2. Получаем токены
      const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({ email, password })

      if (!sessionData.session) {
        await sendMessage(chatId, 'Ошибка авторизации.')
        return new Response('OK')
      }

      // 3. Записываем токены в базу (UPSERT)
      const { error: dbError } = await supabaseAdmin.from('auth_sessions').upsert({
        id: sessionId,
        status: 'success',
        tokens: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          user: sessionData.user,
        },
      })

      if (dbError) {
        console.error(dbError)
        await sendMessage(chatId, 'Ошибка базы данных.')
      } else {
        await sendMessage(chatId, `✅ Вход выполнен!\nВозвращайтесь в приложение.`)
      }
      return new Response('OK')
    }

    // === СЦЕНАРИЙ 2: СОХРАНЕНИЕ ЗАМЕТКИ (Любой другой текст) ===

    // 1. Находим юзера по ID
    const email = `${telegramUserId}@telegram.fleeets.app`
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)

    if (!user) {
      await sendMessage(
        chatId,
        'Сначала войдите в приложение через команду /start (из приложения).'
      )
      return new Response('OK')
    }

    // 2. Сохраняем в базу
    const { error } = await supabaseAdmin.from('notes').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      content: text || 'Вложение',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error(error)
      await sendMessage(chatId, 'Ошибка сохранения.')
    } else {
      // Ставим реакцию
      await setReaction(chatId, message.message_id, '👍')
    }

    return new Response('OK')
  } catch (err) {
    console.error(err)
    return new Response('OK')
  }
})

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
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
