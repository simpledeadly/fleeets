import { createClient } from '../../../../lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function GET() {
  const supabase = await createClient()

  // 1. Берем 10 записей без вектора
  const { data: items } = await supabase
    .from('items')
    .select('id, content, description, raw_content')
    .is('embedding', null)
    .limit(50)

  if (!items || items.length === 0) {
    return NextResponse.json({ message: 'Все векторизировано! 🎉' })
  }

  let processed = 0

  await Promise.all(
    items.map(async (item) => {
      try {
        const text = `${item.content} \n ${item.description || ''} \n ${item.raw_content}`.trim()
        if (!text) return

        const response = await openai.embeddings.create({
          model: 'openai/text-embedding-3-small',
          input: text,
        })
        const embedding = response.data[0].embedding

        await supabase.from('items').update({ embedding }).eq('id', item.id)

        processed++
      } catch (e) {
        console.error(`Error processing ${item.id}`, e)
      }
    })
  )

  return NextResponse.json({
    message: `Обработано ${processed} из ${items.length}. Обнови страницу, чтобы продолжить.`,
  })
}
