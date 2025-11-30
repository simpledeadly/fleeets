import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'
import { sha256 } from 'https://deno.land/x/sha256@v1.0.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await req.json()
    console.log('Function invoked with user:', JSON.stringify(user))

    // --- ПРОВЕРКА DEV USER (Усиленная) ---
    // Приводим к строке, чтобы точно совпало
    const isDevUser = String(user.id) === '123456789' && user.hash === 'fake_hash_for_testing'

    if (!isDevUser) {
      console.log('Performing standard Telegram check...')
      const botToken = Deno.env.get('BOT_TOKEN')
      if (!botToken) throw new Error('BOT_TOKEN is missing')

      const secret = new sha256(undefined, 'TEXT').update(botToken).digest()
      const checkString = Object.keys(user)
        .filter((key) => key !== 'hash')
        .sort()
        .map((key) => `${key}=${user[key]}`)
        .join('\n')

      const hash = hmac('sha256', secret, checkString, 'utf8', 'hex')

      if (hash !== user.hash) {
        throw new Error('Invalid Telegram hash')
      }
    } else {
      console.log('Dev User detected. Skipping hash check.')
    }

    // Подключаемся как ADMIN
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const email = `${user.id}@telegram.fleeets`
    const password = `tg_${user.id}_secret_pass_123`

    // 1. Пытаемся получить юзера по ID (самый надежный способ)
    // Мы ищем не по email, а по Telegram ID, который мы сохраним в metadata,
    // или просто пробуем создать, и если есть - ловим ошибку.

    // Простой путь: Сначала пробуем войти
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (!signInError && signInData.session) {
      console.log('User found, signing in...')
      return new Response(JSON.stringify(signInData.session), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Если вход не удался - создаем юзера принудительно (admin.createUser)
    // Это обходит подтверждение почты!
    console.log('User not found, creating new one...')

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Сразу подтверждаем
      user_metadata: {
        full_name: user.first_name
          ? [user.first_name, user.last_name].join(' ').trim()
          : 'Anonymous',
        telegram_id: user.id,
        avatar_url: user.photo_url,
      },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      // Если ошибка "User already registered", значит мы напутали с паролем выше,
      // но admin.createUser обычно бросает ошибку, если email занят.
      throw createError
    }

    // После создания нужно войти, чтобы получить сессию
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError) throw sessionError

    return new Response(JSON.stringify(sessionData.session), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('FINAL ERROR:', error)
    return new Response(JSON.stringify({ error: error.message, details: error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
