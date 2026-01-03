'use server'

import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient } from '../../../lib/supabase/server'
import type { Database } from '@/types/supabase'
import OpenAI from 'openai'
import { logTokenUsage } from '@/features/ai'
import { logEvent } from '@/lib/logging'
import { createAiClient } from '@/lib/ai/client'
// Used only for embeddings

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

type Item = Database['public']['Tables']['items']['Row']

/**
 * 1. СОЗДАНИЕ (Легкое, без векторов)
 */
export async function createItem(text: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  let finalContent = text
  let parentId: string | null = null
  let parentTitle: string | null = null

  // 👇 ЛОГИКА "СИНТАКСИСА ПРОЕКТОВ"
  // Ищем разделитель ">" (например: "Fleeets > Пофиксить баг")
  if (text.includes('>')) {
    const parts = text.split('>')
    // Берем первую часть как название проекта, остальное склеиваем обратно (если там тоже были >)
    const potentialParentName = parts[0].trim()
    const potentialChildContent = parts.slice(1).join('>').trim()

    if (potentialParentName.length > 0 && potentialChildContent.length > 0) {
      // Ищем родителя в базе (нечеткий поиск)
      // Ищем среди НЕ удаленных
      const { data: parent } = await supabase
        .from('items')
        .select('id, content, status')
        .eq('user_id', user.id)
        .neq('status', 'deleted')
        // Используем ilike для поиска без учета регистра (% - это wildcard)
        .ilike('content', `%${potentialParentName}%`)
        .limit(1)
        .maybeSingle()

      if (parent) {
        console.log(`🔗 Found parent: ${parent.content} (${parent.id})`)
        parentId = parent.id
        parentTitle = parent.content
        finalContent = potentialChildContent
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        content: finalContent,
        status: 'inbox',
        type: 'task',
        raw_content: text,
        parent_id: parentId,
        metadata: { source: 'web', syntax_parent: parentTitle },
        revision_count: 0,
        interaction_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, item: data, parentTitle }
  } catch (e: any) {
    return { error: e.message }
  }
}

/**
 * 2. УНИВЕРСАЛЬНОЕ ОБНОВЛЕНИЕ (Ядро логики)
 * Включает: Аналитику, Векторизацию, Счетчики, Смену статусов
 */
export async function updateItem(itemId: string, data: Partial<Item>) {
  const supabase = await createClient()

  // А. Получаем текущее состояние (со всеми полями)
  const { data: currentItem, error: fetchError } = await supabase
    .from('items')
    .select('*') // Берем всё, чтобы видеть старые статусы и счетчики
    .eq('id', itemId)
    .single()

  if (fetchError || !currentItem) return { error: 'Item not found' }

  // Б. Готовим объект обновлений
  const updates: any = { ...data }

  if (
    currentItem.status === 'inbox' &&
    data.status &&
    data.status !== 'inbox'
  ) {
    updates.triaged_at = new Date().toISOString()
  }

  if (data.status === 'inbox') {
    updates.triaged_at = null
  }

  // --- ЛОГИКА СЧЕТЧИКОВ ---
  updates.interaction_count = (currentItem.interaction_count || 0) + 1
  updates.updated_at = new Date().toISOString()

  if (data.content && data.content !== currentItem.content) {
    updates.revision_count = (currentItem.revision_count || 0) + 1
  }

  // Фиксируем начало работы над задачей
  if (
    !currentItem.first_interaction_at &&
    currentItem.status === 'inbox' &&
    data.status &&
    data.status !== 'inbox'
  ) {
    updates.first_interaction_at = new Date().toISOString()
  }

  // --- ЛОГИКА ДАТ ---
  // planned_at ставится ТОЛЬКО для статуса 'today' (фокус)
  if (data.status === 'today' && !currentItem.planned_at && !data.planned_at) {
    updates.planned_at = new Date().toISOString()
  } else if (data.status && data.status !== 'today') {
    // Убираем дату планирования при уходе из фокуса
    updates.planned_at = null
  }

  if (
    data.status === 'done' &&
    !currentItem.completed_at &&
    !data.completed_at
  ) {
    updates.completed_at = new Date().toISOString()
  } else if (data.status && data.status !== 'done') {
    // Снимаем дату завершения при воскрешении задачи
    updates.completed_at = null
  }

  // --- ЛОГИКА ВЕКТОРИЗАЦИИ (При выходе из Инбокса) ---
  if (data.status && data.status !== 'inbox' && data.status !== 'deleted') {
    if (currentItem.status === 'inbox') {
      console.log(`🧠 Векторизация при переходе из Inbox: ${itemId}`)

      const textForEmbedding = `${currentItem.content}\n${
        currentItem.description || ''
      }\n${currentItem.raw_content || ''}`.trim()

      try {
        const embeddingModel = 'openai/text-embedding-3-small'
        const embeddingResponse = await openai.embeddings.create({
          model: embeddingModel,
          input: textForEmbedding,
        })

        updates.embedding = embeddingResponse.data[0].embedding

        // Лог затрат на AI
        if (embeddingResponse.usage) {
          logTokenUsage({
            userId: currentItem.user_id,
            model: embeddingModel,
            action: 'embedding_on_promote',
            inputTokens: embeddingResponse.usage.prompt_tokens,
            outputTokens: 0,
          })
        }
      } catch (e) {
        console.error('Embedding failed during update:', e)
        // Не прерываем обновление, если AI упал
      }
    }
  }

  // Запускаем обновление в БД (логи теперь пишутся триггером)

  // В. Выполняем обновление
  const { error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)

  if (error) return { error: error.message }
  return { success: true }
}

// === ОБЕРТКИ (ХЕЛПЕРЫ) ===
// Используем их в UI для ясности, но внутри они все вызывают updateItem

export async function softDeleteItem(itemId: string) {
  return await updateItem(itemId, { status: 'deleted' })
}

export async function completeItem(itemId: string) {
  // Логика даты уже внутри updateItem
  return await updateItem(itemId, { status: 'done' })
}

export async function updateExecutionLog(itemId: string, text: string) {
  return await updateItem(itemId, { execution_log: text })
}

// Хард-делит остается отдельным, т.к. это DELETE, а не UPDATE
export async function hardDeleteItem(itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function decomposeTask(itemId: string) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: item } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single()

  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('manifesto')
    .eq('id', user.id)
    .single()

  if (!item) return { error: 'Задача не найдена' }

  const userManifesto = profile?.manifesto
    ? `ПРИНЦИПЫ ПОЛЬЗОВАТЕЛЯ: ${JSON.stringify(profile.manifesto)}`
    : ''

  // 👇 НОВЫЙ, БОЛЕЕ "МЯГКИЙ" ПРОМПТ, КОТОРЫЙ НЕ БЕСИТ ФАЙРВОЛ
  const systemPrompt = `
    Ты — креативный ассистент. Твоя задача — разбить большую задачу на 3-5 простых и понятных шага.
    Учитывай принципы пользователя, если они есть.
    Твой ответ ДОЛЖЕН быть в формате JSON.
    
    Пример ответа:
    {
      "steps": ["Первый шаг", "Второй шаг", "Третий шаг"]
    }
    
    ЗАДАЧА ПОЛЬЗОВАТЕЛЯ: "${item.content}"
    ${userManifesto}
  `

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Разбей задачу "${item.content}" на конкретные шаги.`,
        },
      ],
      model: 'meta-llama/llama-3.1-8b-instruct',
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = completion.choices[0].message.content || ''
    console.log('🤖 AI Decomposer Returned:', content)
    const parsed = JSON.parse(content)
    const subtasks: string[] =
      parsed.steps || parsed.subtasks || parsed.data || []

    if (subtasks.length === 0) {
      // Если массив пустой, значит, AI вернул JSON, но не смог придумать шаги
      console.error('AI returned valid JSON but with empty steps:', parsed)
      return { error: 'AI не смог разбить задачу. Попробуй переформулировать.' }
    }

    const newItems = subtasks
      .map((taskContent) => ({
        user_id: user.id,
        content: taskContent,
        status: 'inbox',
        type: 'task',
        parent_id: item.id,
        raw_content: taskContent,
        metadata: { source: 'ai_decomposition' },
      }))
      .reverse()

    const { data: createdItems, error: insertError } = await supabase
      .from('items')
      .insert(newItems)
      .select()

    if (insertError) {
      console.error('Insert failed after decomposition:', insertError)
      return { error: 'Не удалось сохранить подзадачи.' }
    }

    await updateItem(item.id, { status: 'archived' })

    // Логирование декомпозиции (можно оставить в коде, так как это сложное событие с метаданными подзадач,
    // которые триггер не видит)
    await logEvent({
      userId: user.id,
      itemId: item.id,
      eventType: 'item.decompose',
      meta: {
        subtask_count: subtasks.length,
        subtask_ids: createdItems?.map((i) => i.id) || [],
        original_content: item.content,
      },
    })

    return { success: true, count: subtasks.length, newItems: createdItems }
  } catch (e: any) {
    // Если упал JSON.parse или сам fetch
    console.error('Decomposition failed:', e)
    return { error: 'Ошибка AI: не удалось обработать ответ.' }
  }
}

/**
 * 4. МАССОВЫЕ ОПЕРАЦИИ (Группировка)
 */
export async function bulkAddTag(itemIds: string[], tag: string) {
  const supabase = await createClient()

  // Получаем текущие теги и контент для всех элементов
  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id, ai_tags, content')
    .in('id', itemIds)

  if (fetchError || !items)
    return { error: fetchError?.message || 'Items not found' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Готовим массив обновлений
  const updates = items.map((item) => ({
    id: item.id,
    user_id: user.id, // Обязательно для RLS политик
    content: item.content, // Обязательно для NOT NULL constraint
    ai_tags: Array.from(new Set([...(item.ai_tags || []), tag])),
  }))

  const { error: updateError } = await supabase.from('items').upsert(updates)

  if (updateError) return { error: updateError.message }
  return { success: true }
}

/**
 * Удаляет тег у нескольких элементов
 */
export async function bulkRemoveTag(itemIds: string[], tag: string) {
  const supabase = await createClient()

  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id, ai_tags, content')
    .in('id', itemIds)

  if (fetchError || !items)
    return { error: fetchError?.message || 'Items not found' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates = items.map((item) => ({
    id: item.id,
    user_id: user.id,
    content: item.content,
    ai_tags: (item.ai_tags || []).filter((t: string) => t !== tag),
  }))

  const { error: updateError } = await supabase.from('items').upsert(updates)

  if (updateError) return { error: updateError.message }
  return { success: true }
}
export async function renameGroup(oldTag: string, newName: string) {
  const supabase = await createClient()
  const newTag = `group:${newName}`

  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id, ai_tags, content')
    .contains('ai_tags', [oldTag])

  if (fetchError || !items)
    return { error: fetchError?.message || 'Items not found' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates = items.map((item) => ({
    id: item.id,
    user_id: user.id,
    content: item.content,
    ai_tags: (item.ai_tags || [])
      .map((t: string) => (t === oldTag ? newTag : t))
      .filter(Boolean),
  }))

  const { error: updateError } = await supabase.from('items').upsert(updates)
  if (updateError) return { error: updateError.message }
  return { success: true }
}

/**
 * Удаляет группу (удаляет тег group:* у всех элементов)
 */
export async function deleteGroup(tag: string) {
  const supabase = await createClient()

  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id, ai_tags, content')
    .contains('ai_tags', [tag])

  if (fetchError || !items)
    return { error: fetchError?.message || 'Items not found' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates = items.map((item) => ({
    id: item.id,
    user_id: user.id,
    content: item.content,
    ai_tags: (item.ai_tags || []).filter((t: string) => t !== tag),
  }))

  const { error: updateError } = await supabase.from('items').upsert(updates)
  if (updateError) return { error: updateError.message }
  return { success: true }
}

/**
 * 5. AI MAGIC (Авто-группировка)
 */
export async function suggestGroupForItems(itemsContent: string[]) {
  if (!itemsContent || itemsContent.length === 0) {
    return { error: 'Список элементов пуст' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const groq = createAiClient({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    userId: user.id,
    action: 'suggest_group',
  })

  const systemPrompt = `
    Ты — эксперт по категоризации. Твоя задача — найти ОБЩИЙ контекст для списка элементов и предложить ОДНО название группы.
    
    ОТТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
    { "group": "Название/Подтема" }

    Правила:
    1. Название должно быть кратким (1-3 слова).
    2. Если это проект, верни название проекта (например: "Fleeets", "Flode").
    3. Если это подтема, верни иерархию через слэш (например: "Fleeets/Reports", "Учёба/Математика").
    4. Если общего контекста НЕТ, верни "inbox".
    5. Используй язык, на котором написаны задачи (русский или английский).
  `

  console.log(
    `🤖 [AI Magic] Suggesting group for ${itemsContent.length} items:`,
    itemsContent
  )

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Элементы:\n${itemsContent.map((c) => `- ${c}`).join('\n')}`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      temperature: 0.15,
    })

    const content = completion.choices[0].message.content || '{}'
    console.log(`🤖 [AI Magic] Raw response: ${content}`)

    const parsed = JSON.parse(content)
    const suggestion = (parsed.group || 'inbox').trim()

    const cleanSuggestion = suggestion
      .replace(/["']/g, '')
      .replace(/^group:/, '')

    return { success: true, group: cleanSuggestion }
  } catch (e: any) {
    console.error('❌ AI suggestion failed:', e)
    return { error: `AI error: ${e.message || 'Unknown error'}` }
  }
}
