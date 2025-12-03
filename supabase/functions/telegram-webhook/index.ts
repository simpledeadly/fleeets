// supabase/functions/telegram-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'
import { sha256 } from 'https://deno.land/x/sha256@v1.0.2/mod.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
// Замените на адрес вашего сайта (куда возвращать юзера)
const SITE_URL = 'https://fleeets.vercel.app'

serve(async (req) => {
  try {
    const update = await req.json()

    // Нам интересны только сообщения с текстом /start
    if (update.message && update.message.text && update.message.text.startsWith('/start')) {
      const chatId = update.message.chat.id
      const user = update.message.from

      // 1. Формируем данные для авторизации (как делает виджет)
      const authDate = Math.floor(Date.now() / 1000)
      const dataToSign = {
        auth_date: authDate,
        first_name: user.first_name,
        id: user.id,
        username: user.username || '',
      }

      // Если есть фамилия или фото, добавляем
      if (user.last_name) dataToSign['last_name'] = user.last_name
      if (user.photo_url) dataToSign['photo_url'] = user.photo_url

      // 2. Сортируем ключи и создаем строку проверки (строго по доке Telegram)
      // Ключи должны быть a-z
      const checkString = Object.keys(dataToSign)
        .sort()
        .filter((k) => dataToSign[k]) // убираем пустые
        .map((k) => `${k}=${dataToSign[k]}`)
        .join('\n')

      // 3. Подписываем (HMAC-SHA256)
      const secretKey = sha256(BOT_TOKEN, 'utf8', 'bytes')
      const hash = hmac('sha256', secretKey, checkString, 'utf8', 'hex')

      // 4. Формируем ссылку для возврата
      // Мы передаем данные в URL, фронтенд их схватит и отправит на login
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(dataToSign)) {
        if (value) params.append(key, String(value))
      }
      params.append('hash', hash as string)

      const loginUrl = `${SITE_URL}/auth/callback?${params.toString()}`

      // 5. Отправляем ответ с кнопкой
      const responseText = `Привет, ${user.first_name}! Нажми кнопку ниже, чтобы войти.`

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          reply_markup: {
            inline_keyboard: [[{ text: '🔐 Войти в Fleeets', url: loginUrl }]],
          },
        }),
      })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 500 })
  }
})
