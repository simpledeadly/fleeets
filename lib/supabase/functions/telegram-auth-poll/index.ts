import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Обработка CORS (чтобы браузер не ругался)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id } = await req.json()
    if (!session_id) throw new Error('No session_id')

    // Используем Service Role, чтобы читать таблицу auth_sessions (она закрыта RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Ищем сессию
    const { data, error } = await supabaseAdmin
      .from('auth_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    // 2. Если нет данных или статус не success — ждем дальше
    if (error || !data || data.status !== 'success') {
      return new Response(JSON.stringify({ status: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Если УСПЕХ: Отдаем токены и удаляем запись (одноразовая)
    // Удаляем СНАЧАЛА, чтобы нельзя было использовать дважды
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
