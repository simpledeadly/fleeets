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

      // 1. ПОЛУЧАЕМ АВАТАРКУ
      const avatarUrl = await getUserProfilePhotoUrl(telegramUserId)

      // 2. Создаем/Находим юзера
      const email = `${telegramUserId}@telegram.fleeets.app`
      const password = `tg_${telegramUserId}_${SUPABASE_SERVICE_ROLE_KEY}`

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      let user = existingUsers.users.find((u) => u.email === email)

      if (!user) {
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            telegram_id: telegramUserId,
            first_name: message.from.first_name,
            username: message.from.username,
            avatar_url: avatarUrl, // <-- СОХРАНЯЕМ СЮДА
          },
        })
      } else {
        // Если юзер уже был, ОБНОВЛЯЕМ ему аватарку (вдруг сменил)
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            avatar_url: avatarUrl,
          },
        })
      }

      // 3. Логиним и отдаем токены
      const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({ email, password })

      if (sessionData.session) {
        await supabaseAdmin.from('auth_sessions').upsert({
          id: sessionId,
          status: 'success',
          tokens: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
            user: sessionData.user, // Тут уже будет обновленная метадата
          },
        })
        await sendMessage(chatId, `✅ Вход выполнен! Возвращайтесь в приложение.`)
      } else {
        await sendMessage(chatId, 'Ошибка авторизации.')
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

async function getUserProfilePhotoUrl(userId: number): Promise<string | null> {
  try {
    // 1. Спрашиваем список фоток юзера
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${userId}&limit=1`
    )
    const data = await res.json()

    if (!data.ok || data.result.total_count === 0) return null

    // Берем самую последнюю (самую большую) версию первой фотки
    const photos = data.result.photos[0]
    const bestPhoto = photos[photos.length - 1]
    const fileId = bestPhoto.file_id

    // 2. Получаем путь к файлу
    const fileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
    )
    const fileData = await fileRes.json()

    if (!fileData.ok) return null

    // 3. Формируем публичную ссылку (она работает через сервера Telegram)
    // Примечание: Эта ссылка временная (ок. часа), но для сессии хватит.
    // В идеале: скачивать файл и лить в Supabase Storage, но это усложнит код в 3 раза.
    // Пока оставим так.
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`
  } catch (e) {
    console.error('Avatar fetch error:', e)
    return null
  }
}
