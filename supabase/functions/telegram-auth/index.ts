// supabase/functions/telegram-auth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'
import { sha256 } from 'https://deno.land/x/sha256@v1.0.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user: telegramUser } = await req.json()

    // 1. Получаем секрет бота из переменных окружения (задать в Supabase Dashboard!)
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) throw new Error('BOT_TOKEN is missing')

    // 2. Валидация данных от Telegram (Проверка Хэша)
    const { hash, ...data } = telegramUser
    const dataCheckString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n')

    // Создаем секретный ключ из токена бота
    const secretKey = sha256(botToken, 'utf8', 'bytes')
    // Считаем HMAC
    const calculatedHash = hmac('sha256', secretKey, dataCheckString, 'utf8', 'hex')

    if (calculatedHash !== hash) {
      throw new Error('Invalid Telegram Hash')
    }

    // 3. Если хэш верный — авторизуем пользователя в Supabase
    // Создаем Supabase Admin Client (нужен SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Генерируем email на основе Telegram ID (т.к. Telegram не дает email)
    const email = `${telegramUser.id}@telegram.fleeets.app`
    const password = `tg_${telegramUser.id}_${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` // Случайный сложный пароль, пользователю он не нужен

    // Пытаемся получить пользователя или создать нового
    // Сначала проверим, есть ли он
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    let userId = existingUsers.users.find((u) => u.email === email)?.id

    if (!userId) {
      // Создаем нового
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password, // Технический пароль
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

    // 4. Выдаем сессию (Sign In)
    const { data: sessionData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) throw loginError

    return new Response(JSON.stringify(sessionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
