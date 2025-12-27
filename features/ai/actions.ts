'use server'

import OpenAI from 'openai'
import { Item } from '@/lib/store'
import { createClient } from '@/lib/supabase/server'
import { getSystemPromptTools } from '@/features/gen-ui'
import { logTokenUsage } from './analytics'

// Настраиваем клиента на OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function createItem(text: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    const embeddingModel = 'openai/text-embedding-3-small'
    // 1. Генерируем вектор
    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: text.replace(/\n/g, ' '),
    })
    const embedding = embeddingResponse.data[0].embedding

    // 📊 ЛОГ
    if (embeddingResponse.usage) {
      logTokenUsage({
        userId: user.id,
        model: embeddingModel,
        action: 'create_item',
        inputTokens: embeddingResponse.usage.prompt_tokens,
        outputTokens: 0,
      })
    }

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

export async function getAllItemsWithEmbeddings() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('items')
    .select('id, content, type, status, embedding')
    .eq('user_id', user.id)
    .not('embedding', 'is', null)
    .not('status', 'eq', 'deleted')

  if (error) return []
  return data
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
    console.log('[RAG] У этой задачи нет вектора (embedding is null)')
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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-large-v3')
    formData.append('response_format', 'verbose_json')

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
    const text = data.text
    const duration = data.duration || 0 // Groq возвращает duration в секундах

    // 📊 ЛОГ
    if (user) {
      logTokenUsage({
        userId: user.id,
        model: 'whisper-large-v3',
        action: 'transcription',
        seconds: duration, // Передаем секунды!
      })
    }

    return { success: true, text }
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

  // --- 1. Быстрый текстовый поиск (FTS) с фильтром ---
  const { data: ftsResults } = await supabase
    .from('items')
    .select()
    // 👇 ГЛАВНЫЙ ФИКС: Исключаем inbox и deleted
    .not('status', 'in', '("inbox", "deleted")')
    .textSearch('content', ftsQuery, { type: 'websearch', config: 'russian' })
    .limit(10)

  const ftsItems: SearchResult[] = (ftsResults || []).map((item) => ({
    ...item,
    search_type: 'fts',
  }))

  // --- 2. Глубокий семантический поиск (RAG) ---
  // (Этот блок уже работает правильно, так как match_items фильтрует)
  const embeddingResponse = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: query,
  })
  const embedding = embeddingResponse.data[0].embedding

  const { data: semanticResults } = await supabase.rpc('match_items', {
    query_embedding: embedding,
    match_threshold: 0.4,
    match_count: 8,
    user_id_input: user.id,
  })

  // 👇 Приводим к типу SearchResult сразу
  const semanticItems: SearchResult[] = (semanticResults || []).map(
    (item: any) => ({
      // Используем any, так как rpc возвращает untyped
      ...item,
      search_type: 'semantic',
    })
  )

  // --- 3. Объединение и дедупликация ---
  const allItems = [...ftsItems, ...semanticItems]
  const uniqueItems = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  )

  // Сортировка: сначала FTS, потом семантические по убыванию похожести
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
    match_threshold: 0.4,
    match_count: 6,
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
  const embeddingModel = 'openai/text-embedding-3-small'

  // 1. Поиск контекста (RAG)
  // Генерим вектор вопроса
  const embeddingResp = await openai.embeddings.create({
    model: embeddingModel,
    input: question,
  })
  const vector = embeddingResp.data[0].embedding

  // 📊 ЛОГ 1: Эмбеддинг
  // У OpenAI usage находится в embeddingResp.usage
  if (embeddingResp.usage) {
    logTokenUsage({
      userId: user.id,
      model: embeddingModel,
      action: 'embedding',
      inputTokens: embeddingResp.usage.prompt_tokens,
      outputTokens: 0,
    })
  }

  const { data: contextItems } = await supabase.rpc('match_items', {
    query_embedding: vector,
    match_threshold: 0.35,
    match_count: 10,
    user_id_input: user.id,
  })

  if (!contextItems || contextItems.length === 0) {
    return { answer: 'Я не нашел ничего похожего в твоей базе.' }
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }

  // 2. Сборка промпта
  const contextString = contextItems
    .map((item: any) => {
      const created = new Date(item.created_at).toLocaleDateString('ru-RU')

      // --- ЛОГИКА СТАТУСОВ ---
      let statusText = 'Неизвестный статус'

      switch (item.status) {
        case 'inbox':
          statusText = '📥 [Входящее/Неообработанное]'
          break
        case 'today':
          statusText = '🔥 [В ФОКУСЕ / Делать сегодня]'
          break
        case 'done':
          // Добавляем дату завершения, если есть
          const completedDate = item.completed_at
            ? new Date(item.completed_at).toLocaleDateString('ru-RU')
            : ''
          statusText = `✅ [ВЫПОЛНЕНО: ${completedDate}]`
          break
        case 'archived':
          statusText = '🗄 [Архив / Справочная инфа]'
          break
        case 'deleted':
          statusText = '🗑 [В корзине]'
          break
        case 'planned':
          // Добавляем дату планирования
          const planDate = item.planned_at
            ? new Date(item.planned_at).toLocaleDateString('ru-RU')
            : 'без даты'
          statusText = `📅 [ЗАПЛАНИРОВАНО на: ${planDate}]`
          break
      }

      const typeText =
        item.type === 'note'
          ? 'Заметка'
          : item.type === 'thought'
          ? 'Мысль'
          : 'Задача'
      const quickTag = item.is_quick ? '⚡️ [БЛИЦ/Быстрое]' : ''
      const aiTags =
        item.ai_tags && item.ai_tags.length > 0
          ? `Теги: ${item.ai_tags.join(', ')}`
          : ''

      const priority =
        item.priority && item.priority === 'critical'
          ? '‼️ КРИТИЧЕСКИЙ ПРИОРИТЕТ'
          : item.priority === 'high'
          ? '❗️ ВЫСОКИЙ ПРИОРИТЕТ'
          : item.priority === 'low'
          ? '🔽 Низкий приоритет'
          : ''

      const log = item.execution_log
        ? `\n📝 ЗАМЕТКИ В ПРОЦЕССЕ ВЫПОЛНЕНИЯ:\n"${item.execution_log}"`
        : ''

      // Собираем всё в один блок
      return `
        === ЭЛЕМЕНТ БАЗЫ ЗНАНИЙ ===
        ID: ${item.id}
        Тип: ${typeText} | Статус: ${statusText} ${quickTag}
        Создано: ${created}
        ${priority}
        ${aiTags}

        ЗАГОЛОВОК: "${item.content}"

        ПОДРОБНОСТИ:
        ${item.description || 'Нет описания'}
        ${log}
        ===========================`.trim()
    })
    .join('\n\n')

  console.log(contextString)

  // 3. Системный промпт с ОРИЕНТАЦИЕЙ ВО ВРЕМЕНИ
  const now = new Date()
  const currentDateStr = now.toLocaleDateString('ru-RU', dateOptions)

  const systemPrompt = `
    ТЫ — ВТОРОЙ МОЗГ И АССИСТЕНТ.
    
    СЕГОДНЯ: ${currentDateStr}
    
    Твоя цель — помогать пользователю.
    
    ИНСТРУМЕНТЫ (GenUI):
    ${getSystemPromptTools()}

    ПРАВИЛА:
    1. Если пользователь задает ВОПРОС о своих записях — отвечай строго по КОНТЕКСТУ.
    2. Если пользователь просит СОЗДАТЬ, ПРИДУМАТЬ или СОСТАВИТЬ план (которого нет в базе) — ты МОЖЕШЬ использовать свои общие знания и креативность.
    3. Если нужен инструмент (например, decomposition) — верни ТОЛЬКО валидный JSON.
    4. Массив данных в JSON НЕ ДОЛЖЕН быть пустым. Если данных нет — придумай их или ответь текстом.

    КОНТЕКСТ ИЗ БАЗЫ:
    ${contextString}
  `

  // 3. Генерация ответа (через Groq Llama-3 для скорости)
  // const groq = new OpenAI({
  //   apiKey: process.env.GROQ_API_KEY,
  //   baseURL: 'https://api.groq.com/openai/v1',
  // })

  const llmModel = 'meta-llama/llama-3.1-8b-instruct'

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      model: llmModel,
      temperature: 0.7,
    })

    // 📊 ЛОГ 2: Генерация текста
    if (completion.usage) {
      logTokenUsage({
        userId: user.id,
        model: llmModel,
        action: 'rag_query',
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
      })
    }

    const content = completion.choices[0].message.content || ''
    console.log('🤖 [Brain] Ответ:', content)

    try {
      const firstBrace = content.indexOf('{')
      const lastBrace = content.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = content.substring(firstBrace, lastBrace + 1)
        const parsed = JSON.parse(jsonString)

        // Проверяем, что это наш формат и там есть данные
        if (
          parsed.type &&
          Array.isArray(parsed.data) &&
          parsed.data.length > 0
        ) {
          return {
            answer: null,
            genUI: parsed,
            sources: contextItems,
          }
        }
      }
    } catch (e) {
      console.error('JSON Parse Error:', e)
    }

    return {
      answer: content,
      sources: contextItems,
    }
  } catch (e: any) {
    console.error('🔥 [Brain] Error:', e)
    return { error: e.message }
  }
}
