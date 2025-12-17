'use server'

import OpenAI from 'openai'
import { Item } from '@/lib/store'
import { createClient } from '@/lib/supabase/server'
import { getSystemPromptTools } from '@/features/gen-ui'

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

export async function transcribeAudio(audioBlob: Blob) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY) {
    return { success: false, error: 'GROQ_API_KEY is not set.' }
  }

  try {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-large-v3')

    const response = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error.message || 'Groq API error')
    }

    const data = await response.json()
    return { success: true, text: data.text }
  } catch (e: any) {
    console.error('Transcription Error (Groq):', e)
    return { success: false, error: e.message }
  }
}

// Тип для результата поиска
export type SearchResult = Item & {
  similarity?: number
  search_type: 'fts' | 'semantic'
}

export async function searchWithAI(query: string): Promise<SearchResult[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const ftsQuery = query.trim().split(' ').join(' & ') + ':*'

  // --- 1. Быстрый текстовый поиск (FTS) ---
  const { data: ftsResults } = await supabase
    .from('items')
    .select()
    .textSearch('content', ftsQuery, { type: 'websearch', config: 'russian' })
    .limit(10)

  const ftsItems: SearchResult[] = (ftsResults || []).map((item) => ({
    ...item,
    search_type: 'fts',
  }))

  // --- 2. Глубокий семантический поиск (RAG) ---
  // Генерируем вектор для запроса
  const embeddingResponse = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: query,
  })
  const embedding = embeddingResponse.data[0].embedding

  // Вызываем нашу SQL-функцию
  const { data: semanticResults } = await supabase.rpc('match_items', {
    query_embedding: embedding,
    match_threshold: 0.35, // Более низкий порог, т.к. мы потом отфильтруем
    match_count: 10,
    user_id_input: user.id,
  })

  const semanticItems: SearchResult[] = (semanticResults || []).map(
    (item: Item) => ({
      ...item,
      search_type: 'semantic',
    })
  )

  // --- 3. Объединение и дедупликация ---
  const allItems = [...ftsItems, ...semanticItems]
  const uniqueItems = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  )

  uniqueItems.sort((a, b) => {
    if (a.search_type === 'fts' && b.search_type !== 'fts') return -1
    if (b.search_type === 'fts' && a.search_type !== 'fts') return 1
    return (a.similarity || 0) - (b.similarity || 0)
  })

  return uniqueItems
}

export async function findSimilarItemsByQuery(query: string): Promise<Item[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !query.trim()) return []

  const embeddingResponse = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: query,
  })
  const embedding = embeddingResponse.data[0].embedding

  const { data: similarItems } = await supabase.rpc('match_items', {
    query_embedding: embedding,
    match_threshold: 0.35, // Более строгий порог для подсказок
    match_count: 4,
    user_id_input: user.id,
  })

  return similarItems || []
}

export async function askBrain(question: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Auth required' }

  // 1. Поиск контекста (RAG)
  // Генерим вектор вопроса
  const embeddingResp = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: question,
  })
  const vector = embeddingResp.data[0].embedding

  const { data: contextItems } = await supabase.rpc('match_items', {
    query_embedding: vector,
    match_threshold: 0.3,
    match_count: 50,
    user_id_input: user.id,
  })

  if (!contextItems || contextItems.length === 0) {
    return { answer: 'Я не нашел ничего похожего в твоей базе.' }
  }

  // 2. Сборка промпта
  const contextString = contextItems
    .map(
      (item: any) =>
        `--- [${item.created_at}] ${item.content}\n${item.description || ''}`
    )
    .join('\n\n')

  const toolsPrompt = getSystemPromptTools()

  const systemPrompt = `
    ТЫ — ВТОРОЙ МОЗГ.
    
    У тебя есть набор визуальных инструментов. Выбери подходящий или ответь текстом.

    ИНСТРУМЕНТЫ:
    ${toolsPrompt}

    ЕСЛИ НУЖЕН ИНСТРУМЕНТ: Верни ТОЛЬКО JSON объект.
    ЕСЛИ НЕТ ПОДХОДЯЩЕГО: Отвечай обычным текстом, без markdown.

    КОНТЕКСТ ИЗ БАЗЫ:
    ${contextString}
  `

  // 3. Генерация ответа (через Groq Llama-3 для скорости)
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
    })

    const content = completion.choices[0].message.content || ''

    try {
      const cleanContent = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()

      if (cleanContent.startsWith('{')) {
        const parsed = JSON.parse(cleanContent)

        // Если это наш формат GenUI
        if (parsed.type && parsed.data) {
          return {
            answer: null,
            genUI: parsed,
            sources: contextItems,
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Если не парсится — значит это просто текст
    }

    return {
      answer: content,
      sources: contextItems,
    }
  } catch (e: any) {
    return { error: e.message }
  }
}
