import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    // 1. Получаем данные от Database Webhook
    const payload = await req.json()
    const record = payload.record // Та самая запись, которая только что создалась

    // Если это не текст или уже обработано - выходим
    if (!record.content || record.ai_tags?.includes('processed')) {
      return new Response('Skipped')
    }

    console.log(`Processing item: ${record.id}`)

    // 2. Стучимся в Llama 3 (через Groq)
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
              Ты — профессиональный секретарь. Твоя задача — преобразовать сырой поток мыслей в четкую задачу.
              
              ВХОД: "${record.content}"
              
              ПРАВИЛА:
              1. Title: Сделай заголовок кратким (до 5-7 слов), начинай с глагола (Купить, Сделать, Написать).
              2. Priority: 'high', 'medium', 'low'.
              3. Type: 'task' (действие), 'note' (информация), 'thought' (идея).
              4. Is_Quick: true, если это займет меньше 5 минут.
              
              ОТВЕТ В ФОРМАТЕ JSON:
              {
                "title": "...",
                "description": "...", 
                "priority": "...",
                "type": "...",
                "is_quick": boolean
              }
            `,
            },
            { role: 'user', content: record.content },
          ],
          response_format: { type: 'json_object' },
        }),
      }
    )

    const aiJson = await response.json()
    const content = JSON.parse(aiJson.choices[0].message.content)

    // 3. Обновляем запись в базе
    await supabase
      .from('items')
      .update({
        content: content.title, // Заменяем сырой текст на красивый
        description: record.content, // Сырой сохраняем в описание (чтобы не потерять)
        raw_content: record.content,
        priority: content.priority,
        type: content.type,
        is_quick: content.is_quick,
        ai_tags: ['processed'], // Метка, чтобы не обрабатывать вечно
      })
      .eq('id', record.id)

    return new Response('Success')
  } catch (error) {
    console.error(error)
    return new Response('Error', { status: 500 })
  }
})
