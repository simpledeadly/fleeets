import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'
import { sha256 } from 'https://deno.land/x/sha256@v1.0.2/mod.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Создаем админ-клиента для генерации токенов
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const update = await req.json()

    // Ловим команду /start
    if (update.message && update.message.text && update.message.text.startsWith('/start')) {
      const chatId = update.message.chat.id
      const text = update.message.text
      const user = update.message.from

      // 1. Извлекаем UUID сессии из команды "/start <uuid>"
      // Пример: "/start 550e8400-e29b-41d4-a716-446655440000"
      const parts = text.split(' ')
      const sessionId = parts.length > 1 ? parts[1].trim() : null

      if (!sessionId) {
        // Если просто /start без кода — шлем приветствие (старая логика или заглушка)
        await sendMessage(chatId, 'Привет! Для входа используйте кнопку в приложении.')
        return new Response('OK')
      }

      // 2. Логика авторизации пользователя (найти или создать)
      const email = `${user.id}@telegram.fleeets.app`
      const password = `tg_${user.id}_${SUPABASE_SERVICE_ROLE_KEY}`

      // Проверяем существование
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers.users.find((u) => u.email === email)

      if (!existingUser) {
        // Создаем нового
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            telegram_id: user.id,
            first_name: user.first_name,
            username: user.username,
            avatar_url: user.photo_url, // Если есть
          },
        })
      }

      // 3. Генерируем сессию (токены)
      const { data: sessionData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError || !sessionData.session) {
        await sendMessage(chatId, 'Ошибка авторизации на сервере.')
        return new Response('OK')
      }

      // 4. ОТПРАВЛЯЕМ ТОКЕНЫ В ПРИЛОЖЕНИЕ ЧЕРЕЗ REALTIME
      // Мы посылаем событие в канал с именем sessionId (UUID)
      const channel = supabaseAdmin.channel(`auth:${sessionId}`)

      // Небольшая задержка, чтобы подписка успела инициализироваться (если нужно)
      // Но обычно клиент уже ждет.

      await channel.send({
        type: 'broadcast',
        event: 'login_token',
        payload: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          user: sessionData.user,
        },
      })

      // Мы также отписываем сервер от канала, чтобы не висело
      supabaseAdmin.removeChannel(channel)

      // 5. Отвечаем пользователю в Телеграм
      await sendMessage(chatId, `✅ Вход выполнен! \nВы можете вернуться в приложение.`)
    }

    return new Response('OK')
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 200 }) // Всегда 200 для Телеграма
  }
})

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}
