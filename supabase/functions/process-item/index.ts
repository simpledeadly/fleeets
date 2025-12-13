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
                  # ROLE & GOAL:
                  You are a ZERO-TOLERANCE PARSER. Your only function is to extract distinct items from the user's text.

                  # CRITICAL DIRECTIVES:
                  1.  **NO SUMMARIZATION. NO GENERALIZATION. EVER.** If the input is "buy water, buy bread", you output two items. Outputting "buy groceries" is a catastrophic failure.
                  2.  **EXTRACT VERBATIM.** Extract tasks as close to the original wording as possible. Do not "improve" or rephrase.
                  3.  **SPLIT AGGRESSIVELY.** Use commas, conjunctions ("и", "а также"), and sentence breaks as separators for new items.
                  4.  **CLASSIFY:** Use 'task' for actions, 'note' for data.

                  # EXAMPLES:
                  - INPUT: "купить воду, изучить сальсу и купить самсу"
                  - OUTPUT JSON: { "items": [{ "content": "Купить воду", "type": "task" }, { "content": "Изучить сальсу", "type": "task" }, { "content": "Купить самсу", "type": "task" }] }
                  - INPUT: "позвонить маме, ее номер 123-456"
                  - OUTPUT JSON: { "items": [{ "content": "Позвонить маме", "type": "task" }, { "content": "Номер мамы: 123-456", "type": "note" }] }

                  # CURRENT INPUT:
                  "${record.content}"

                  # REQUIRED OUTPUT FORMAT (JSON ONLY):
                  { "items": [{ "content": "...", "type": "..." }] }
                  `,
            },
            { role: 'user', content: record.content },
          ],
          response_format: { type: 'json_object' },
        }),
      }
    )

    const aiJson = await response.json()
    const parsedData = JSON.parse(aiJson.choices[0].message.content)

    if (parsedData.items && parsedData.items.length > 0) {
      const newItems = parsedData.items.map((item: any) => ({
        user_id: record.user_id,
        content: item.content,
        type: item.type || 'task',
        status: 'inbox',
        raw_content: record.content, // Сохраняем оригинал
        ai_tags: ['processed-auto'],
      }))

      // Вставляем пачкой
      await supabase.from('items').insert(newItems)

      // Удаляем исходную "грязную" запись
      await supabase.from('items').delete().eq('id', record.id)
    } else {
      // Если AI ничего не нашел - просто обновляем одну запись
      await supabase
        .from('items')
        .update({ content: record.content, ai_tags: ['processed-auto'] })
        .eq('id', record.id)
    }

    return new Response('Success')
  } catch (error) {
    console.error(error)
    return new Response('Error', { status: 500 })
  }
})
