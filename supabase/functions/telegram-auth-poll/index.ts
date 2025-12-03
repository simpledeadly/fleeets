// supabase/functions/telegram-auth-poll/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { session_id } = await req.json()
    if (!session_id) throw new Error('No session_id')

    // Используем Service Role для доступа к таблице auth_sessions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Ищем сессию в базе
    const { data, error } = await supabaseAdmin
      .from('auth_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    // 2. Если сессии нет или она еще pending — возвращаем "жди"
    if (error || !data || data.status !== 'success') {
      return new Response(JSON.stringify({ status: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Если успех — возвращаем токены и УДАЛЯЕМ запись (одноразовая ссылка)
    await supabaseAdmin.from('auth_sessions').delete().eq('id', session_id)

    return new Response(JSON.stringify(data.tokens), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
