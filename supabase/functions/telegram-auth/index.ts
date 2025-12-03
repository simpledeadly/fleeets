// supabase/functions/telegram-auth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  // Обработка CORS preflight запроса
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('1. Received body:', JSON.stringify(body)) // ЛОГ 1

    const telegramUser = body.user
    if (!telegramUser) throw new Error('No user data provided')

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) throw new Error('BOT_TOKEN is missing')

    // --- ВАЛИДАЦИЯ ХЭША (СТРОГАЯ) ---

    // 1. Берем только те поля, которые использует Telegram.
    // Фронтенд может прислать мусор (например, id сессии), он сломает хэш.
    const ALLOWED_KEYS = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date']

    const dataCheckArr = []
    for (const key of ALLOWED_KEYS) {
      // Важно: проверяем именно наличие значения, и переводим в строку
      if (
        telegramUser[key] !== undefined &&
        telegramUser[key] !== null &&
        telegramUser[key] !== ''
      ) {
        // Telegram требует format: key=value
        dataCheckArr.push(`${key}=${telegramUser[key]}`)
      }
    }

    // 2. Сортируем алфавитно
    dataCheckArr.sort()
    const dataCheckString = dataCheckArr.join('\n')

    console.log('2. Check String generated:', dataCheckString) // ЛОГ 2

    // 3. Считаем хэш
    const encoder = new TextEncoder()
    const secretKeyData = await crypto.subtle.digest('SHA-256', encoder.encode(botToken))
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretKeyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(dataCheckString))
    const calculatedHash = toHex(signature)

    console.log(`3. Hashes: Rec [${telegramUser.hash}] vs Calc [${calculatedHash}]`) // ЛОГ 3

    if (calculatedHash !== telegramUser.hash) {
      throw new Error(`Invalid Hash. Check logs for comparison.`)
    }

    // --- РАБОТА С БД ---

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const email = `${telegramUser.id}@telegram.fleeets.app`
    const password = `tg_${telegramUser.id}_${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`

    // Поиск юзера
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers.users.find((u) => u.email === email)
    let userId = existingUser?.id

    if (!userId) {
      console.log('4. Creating new user...')
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
      if (createError) {
        console.error('Create User Error:', createError)
        throw createError
      }
      userId = newUser.user.id
    }

    console.log('5. Signing in...')
    const { data: sessionData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      console.error('Login Error:', loginError)
      throw loginError
    }

    return new Response(JSON.stringify(sessionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('CRITICAL ERROR:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
