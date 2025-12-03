// supabase/functions/telegram-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SITE_URL = 'https://fleeets.vercel.app' // Убедитесь, что адрес верный

// Вспомогательная функция для перевода в HEX
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  try {
    const update = await req.json()

    // Обрабатываем только команду /start
    if (update.message && update.message.text && update.message.text.startsWith('/start')) {
      const chatId = update.message.chat.id
      const user = update.message.from

      // 1. Подготовка данных
      const authDate = Math.floor(Date.now() / 1000)
      const dataToSign: Record<string, string | number> = {
        auth_date: authDate,
        first_name: user.first_name,
        id: user.id,
        username: user.username || '',
      }

      if (user.last_name) dataToSign['last_name'] = user.last_name
      if (user.photo_url) dataToSign['photo_url'] = user.photo_url

      // 2. Сортировка (Telegram requirement)
      const checkString = Object.keys(dataToSign)
        .sort()
        .filter((k) => dataToSign[k])
        .map((k) => `${k}=${dataToSign[k]}`)
        .join('\n')

      // 3. Криптография (Native Web Crypto API)
      const encoder = new TextEncoder()

      // А) Создаем секретный ключ: SHA256 от токена бота
      const secretKeyData = await crypto.subtle.digest('SHA-256', encoder.encode(BOT_TOKEN))

      // Б) Импортируем этот ключ для HMAC
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        secretKeyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )

      // В) Подписываем данные
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(checkString))

      const hash = toHex(signature)

      // 4. Формируем URL
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(dataToSign)) {
        if (value) params.append(key, String(value))
      }
      params.append('hash', hash)

      const loginUrl = `${SITE_URL}/auth/callback?${params.toString()}`

      // 5. Отправляем ответ
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Привет, ${user.first_name}! Для входа нажмите кнопку ниже:`,
          reply_markup: {
            inline_keyboard: [[{ text: '🚀 Войти в Fleeets', url: loginUrl }]],
          },
        }),
      })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Webhook Error:', err)
    // Возвращаем 200 даже при ошибке, чтобы Телеграм не спамил повторами
    return new Response('Error handled', { status: 200 })
  }
})
