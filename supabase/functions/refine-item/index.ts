// supabase/functions/refine-item/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getEmbedding } from '../_shared/analytics.ts'

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
      .select('content, raw_content, user_id')
      .eq('id', item_id)
      .single()

    if (fetchError) {
      // Log to server
      console.error(`Item not found: ${item_id}`, fetchError)
      // Return a clean 404 to the client
      return new Response(
        JSON.stringify({ error: `Item with id ${item_id} not found.` }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const textToProcess = `Исходный текст: ${
      originalItem.raw_content || originalItem.content
    }
      ${
        originalItem.description
          ? '\nОписание:\n' + originalItem.description
          : ''
      }`

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
              Ты — профессиональный секретарь. Преобразуй сырую мысль в чёткую задачу.

              ПРАВИЛА:
              1. Title: Создай яркое, креативное, метафоричное название для этой задачи, как будто это квест в игре Cyberpunk 2077.
              2. Description: Полное описание, если нужно.
              3. Priority: 'critical' 'high', 'medium', 'low'.
              4. Type: 'task', 'note', 'thought', 'resource'.
              5. Is_Quick: true, если меньше 5 минут.
              6. Tags: Массив из 2-5 тегов (существительные, lowercase, на языке текста). Примеры: ["work", "bugfix"], ["здоровье", "магазин"].

              ОТВЕТ В ФОРМАТЕ JSON: { "title": "...", "description": "...", "priority": "...", "type": "...", "is_quick": boolean, "tags": ["tag1", "tag2"] }
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

    // ==========================================
    // 3. 🔥 ГЕНЕРАЦИЯ ВЕКТОРА (МЕГА-СЭНДВИЧ)
    // ==========================================

    // Мы берем Title и Description для семантической чистоты.
    // И добавляем textToProcess (Исходник) для полноты контекста.
    // Добавляем метки, чтобы модель понимала структуру, хотя это не обязательно.

    const textForEmbedding = `
      ${content.title}
      ${content.description || ''}
      ${textToProcess}
    `.trim()

    // Логируем длину, чтобы ты был спокоен
    console.log(`Vectorizing FULL context (${textForEmbedding.length} chars)`)

    const embedding = await getEmbedding(
      textForEmbedding,
      originalItem.user_id,
      'refine'
    )

    // 3. Обновляем запись и возвращаем ее
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update({
        content: content.title,
        description: content.description || textToProcess,
        priority: content.priority,
        type: content.type,
        is_quick: content.is_quick,
        embedding: embedding,
        ai_tags: Array.isArray(content.tags) ? content.tags : ['processed-ai'],
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
