import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// --- AI Хелперы ---

async function classifyText(
  text: string
): Promise<'SIMPLE' | 'COMPLEX' | 'NOTE'> {
  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Быстрая и дешевая модель для классификации
        messages: [
          {
            role: 'system',
            content: `Analyze the text. Respond with ONE WORD: 'SIMPLE' if it's a single, clear task. 'COMPLEX' if it contains multiple tasks, lists, or is ambiguous. 'NOTE' if it's just information. INPUT: "${text}"`,
          },
        ],
        temperature: 0.1,
      }),
    }
  )
  if (!response.ok) return 'COMPLEX' // В случае ошибки, лучше обработать как сложный
  const result = await response.json()
  const classification = result.choices[0]?.message?.content
    ?.trim()
    .toUpperCase()
  return ['SIMPLE', 'COMPLEX', 'NOTE'].includes(classification)
    ? classification
    : 'COMPLEX'
}

async function parseComplexText(text: string): Promise<any[]> {
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
              1.  **NO SUMMARIZATION. EVER.**
              2.  **EXTRACT VERBATIM.**
              3.  **SPLIT AGGRESSIVELY.**
              4.  **CLASSIFY:** Use 'task' for actions, 'note' for data.
              # CURRENT INPUT: "${text}"
              # REQUIRED OUTPUT FORMAT (JSON ONLY): { "items": [{ "content": "...", "type": "..." }] }
              `,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    }
  )
  if (!response.ok) throw new Error(`Groq API Error: ${response.statusText}`)
  const aiJson = await response.json()
  const contentString = aiJson.choices?.[0]?.message?.content
  if (!contentString) throw new Error('AI returned empty content')
  return JSON.parse(contentString).items || []
}

// --- Основная функция ---

serve(async (req) => {
  try {
    const { user_id, raw_text, metadata } = await req.json()
    if (!user_id || !raw_text)
      throw new Error('user_id and raw_text are required')

    // 1. Создаем родительскую "сырую" запись
    const { data: parentItem, error: parentError } = await supabase
      .from('items')
      .insert({
        user_id,
        content: raw_text,
        raw_content: raw_text,
        status: 'archived', // Сразу убираем из Инбокса
        type: 'note',
        ai_tags: ['raw-source'],
        metadata,
      })
      .select()
      .single()

    if (parentError) throw parentError

    // 2. Двухступенчатый AI-пайплайн
    const classification = await classifyText(raw_text)
    let itemsToInsert = []

    if (classification === 'SIMPLE') {
      itemsToInsert.push({ content: raw_text, type: 'task' })
    } else if (classification === 'NOTE') {
      itemsToInsert.push({ content: raw_text, type: 'note' })
    } else {
      // COMPLEX
      itemsToInsert = await parseComplexText(raw_text)
    }

    // 3. Создаем дочерние, чистые записи
    if (itemsToInsert.length > 0) {
      const newItems = itemsToInsert.map((item) => ({
        user_id,
        parent_id: parentItem.id,
        content: item.content,
        type: item.type,
        status: 'inbox',
        raw_content: raw_text, // Копируем оригинал
        ai_tags: ['processed'],
        metadata,
      }))
      await supabase.from('items').insert(newItems)
    }

    return new Response(
      JSON.stringify({ success: true, items: itemsToInsert }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Process-item error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
