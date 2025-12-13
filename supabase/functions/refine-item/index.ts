// supabase/functions/refine-item/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Для разработки ок, для прода лучше 'https://fleeets.app'
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { item_id } = await req.json()
    if (!item_id) throw new Error('item_id is required')

    // 1. Получаем исходную задачу
    const { data: originalItem, error: fetchError } = await supabase
      .from('items')
      .select('content, raw_content')
      .eq('id', item_id)
      .single()

    if (fetchError) throw fetchError

    const textToProcess = originalItem.raw_content || originalItem.content

    // 2. Отправляем в AI (тот же самый промпт)
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `
              Ты — профессиональный секретарь. Преобразуй сырую мысль в четкую задачу.
              ВХОД: "${textToProcess}"
              ПРАВИЛА:
              1. Title: Краткий заголовок (до 7 слов), глагол в начале.
              2. Description: Полное описание, если нужно.
              3. Priority: 'high', 'medium', 'low'.
              4. Type: 'task', 'note', 'thought'.
              5. Is_Quick: true, если меньше 5 минут.
              ОТВЕТ В ФОРМАТЕ JSON: { "title": "...", "description": "...", "priority": "...", "type": "...", "is_quick": boolean }
            `,
            },
            { role: 'user', content: textToProcess },
          ],
          response_format: { type: 'json_object' },
        }),
      }
    )

    const aiJson = await response.json()
    const content = JSON.parse(aiJson.choices[0].message.content)

    // 3. Обновляем запись и возвращаем ее
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update({
        content: content.title,
        description: content.description || textToProcess,
        priority: content.priority,
        type: content.type,
        is_quick: content.is_quick,
        ai_tags: ['processed-manual'], // Другая метка
      })
      .eq('id', item_id)
      .select()
      .single()

    if (updateError) throw updateError

    return new Response(JSON.stringify(updatedItem), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
