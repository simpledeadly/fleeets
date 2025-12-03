import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const update = await req.json()

    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id
      const text = update.message.text
      const user = update.message.from

      const parts = text.split(' ')
      const sessionId = parts.length > 1 ? parts[1].trim() : null

      if (!sessionId) {
        await sendMessage(chatId, 'Ошибка: нет кода сессии.')
        return new Response('OK')
      }

      // 1. Авторизуем/Создаем пользователя (стандартный код)
      const email = `${user.id}@telegram.fleeets.app`
      const password = `tg_${user.id}_${SUPABASE_SERVICE_ROLE_KEY}`

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      if (!existingUsers.users.find((u) => u.email === email)) {
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            telegram_id: user.id,
            first_name: user.first_name,
            username: user.username,
          },
        })
      }

      const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({ email, password })

      if (!sessionData.session) {
        await sendMessage(chatId, 'Ошибка авторизации.')
        return new Response('OK')
      }

      // 2. ВМЕСТО REALTIME -> ПИШЕМ В БАЗУ
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
        await sendMessage(chatId, 'Что-то пошло не так, попробуйте еще раз.')
      } else {
        await sendMessage(chatId, `✅ Вход выполнен!\nВернитесь в приложение.`)
      }
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
