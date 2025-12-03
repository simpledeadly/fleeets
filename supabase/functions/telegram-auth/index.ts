// supabase/functions/telegram-auth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Хелпер для перевода буфера в hex строку
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user: telegramUser } = await req.json()

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) throw new Error('BOT_TOKEN is missing')

    // 1. Валидация данных (Native Web Crypto API)
    const { hash, ...data } = telegramUser

    // Сортируем ключи по алфавиту и собираем строку (спецификация Telegram)
    const dataCheckString = Object.keys(data)
      .sort()
      .filter((k) => data[k]) // Исключаем пустые поля
      .map((key) => `${key}=${data[key]}`)
      .join('\n')

    const encoder = new TextEncoder()

    // А) Создаем секретный ключ (SHA256 от токена бота)
    const secretKeyData = await crypto.subtle.digest('SHA-256', encoder.encode(botToken))

    // Б) Импортируем ключ для HMAC
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretKeyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    // В) Подписываем строку проверки
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(dataCheckString))

    const calculatedHash = toHex(signature)

    if (calculatedHash !== hash) {
      throw new Error(`Invalid Telegram Hash. Calc: ${calculatedHash}, Rec: ${hash}`)
    }

    // 2. Логика Supabase (Создание/Вход пользователя)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const email = `${telegramUser.id}@telegram.fleeets.app`
    // Пароль не важен, пользователь его не вводит
    const password = `tg_${telegramUser.id}_${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`

    // Проверяем существование пользователя
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers.users.find((u) => u.email === email)

    let userId = existingUser?.id

    if (!userId) {
      // Создаем нового
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          username: telegramUser.username,
          avatar_url: telegramUser.photo_url,
        },
      })
      if (createError) throw createError
      userId = newUser.user.id
    }

    // Выдаем сессию
    const { data: sessionData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) throw loginError

    return new Response(JSON.stringify(sessionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Auth Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Возвращаем 400, чтобы фронтенд понял ошибку
    })
  }
})
