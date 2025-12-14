'use server'

import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// Настраиваем клиента на OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function createItemWithAI(text: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    // 1. Генерируем вектор
    const embeddingResponse = await openai.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    })
    const embedding = embeddingResponse.data[0].embedding

    // 2. Сохраняем в БД
    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        content: text,
        raw_content: text,
        type: 'note',
        status: 'inbox',
        embedding: embedding,
        metadata: { source: 'web' },
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, item: data }
  } catch (e: any) {
    console.error('AI Creation Error:', e)
    return { error: e.message }
  }
}

export async function findSimilarItems(itemId: string) {
  const supabase = await createClient()

  // 1. Получаем вектор
  const { data: currentItem } = await supabase
    .from('items')
    .select('embedding, content')
    .eq('id', itemId)
    .single()

  if (!currentItem?.embedding) {
    console.log('❌ [RAG] У этой задачи нет вектора (embedding is null)')
    return []
  }

  // 2. Ищем похожие
  console.log(`🔍 [RAG] Ищем похожие для: "${currentItem.content}"`)

  const { data: similarItems, error } = await supabase.rpc('match_items', {
    query_embedding: currentItem.embedding,
    match_threshold: 0.4,
    match_count: 10,
    user_id_input: (await supabase.auth.getUser()).data.user?.id,
  })

  if (error) {
    console.error('❌ [RAG] Ошибка RPC:', error)
    return []
  }

  // Логируем, что нашли (вместе со скором)
  console.log(
    '✅ [RAG] Найдено:',
    similarItems?.map((i: any) => `${i.content} (${i.similarity})`)
  )

  // Фильтруем саму себя
  return similarItems?.filter((i: any) => i.id !== itemId) || []
}
