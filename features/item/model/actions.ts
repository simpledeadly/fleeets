'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/supabase'
import OpenAI from 'openai'
import { logTokenUsage } from '@/features/ai/analytics'
import { logEvent } from '@/lib/logging' // Твой новый логгер событий

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

type Item = Database['public']['Tables']['items']['Row']

/**
 * 1. СОЗДАНИЕ (Легкое, без векторов)
 */
export async function createItemWithAI(text: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        content: text,
        status: 'inbox',
        type: 'task',
        raw_content: text,
        metadata: { source: 'web' },
        revision_count: 0,
        interaction_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    // Логируем событие создания
    if (data) {
      await logEvent({
        userId: user.id,
        itemId: data.id,
        eventType: 'item.create',
        meta: {
          length: text.length,
          source: 'web',
          item_content: data.content
        },
      })
    }

    revalidatePath('/')
    return { success: true, item: data }
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
  // Мы используем any для updates, чтобы TS не ругался на динамические поля,
  // но data типизирована
  const updates: any = { ...data }

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
  if (data.status === 'today' && !data.planned_at) {
    updates.planned_at = new Date().toISOString()
  }
  if (data.status === 'done' && !data.completed_at) {
    updates.completed_at = new Date().toISOString()
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

  // --- ЛОГИРОВАНИЕ СОБЫТИЙ (DATA HOARDING) ---
  const logPromises = []

  // 1. Смена статуса (Воронка)
  if (data.status && data.status !== currentItem.status) {
    // Триггер разбора инбокса
    if (currentItem.status === 'inbox') {
      logPromises.push(
        logEvent({
          userId: currentItem.user_id,
          itemId: itemId,
          eventType: 'item.triage', // <--- Специальное событие
          meta: { destination: data.status, item_content: currentItem.content },
        })
      )
    }

    logPromises.push(
      logEvent({
        userId: currentItem.user_id,
        itemId: itemId,
        eventType: 'item.status_change',
        meta: {
          from: currentItem.status,
          to: data.status,
          item_content: currentItem.content,
          // Сколько времени висело в старом статусе (в часах)
          hours_in_status:
            Math.round(
              ((Date.now() -
                new Date(
                  currentItem.updated_at || currentItem.created_at
                ).getTime()) /
                1000 /
                3600) *
                10
            ) / 10,
        },
      })
    )
  }
  // 2. Просто редактирование
  else if (Object.keys(data).length > 0) {
    logPromises.push(
      logEvent({
        userId: currentItem.user_id,
        itemId: itemId,
        eventType: 'item.update',
        meta: { fields: Object.keys(data) },
      })
    )
  }

  // Запускаем логи в фоне, не ждем их
  Promise.all(logPromises).catch((err) => console.error('Logging failed', err))

  // В. Выполняем обновление
  const { error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)

  if (error) return { error: error.message }
  revalidatePath('/')
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
  revalidatePath('/')
  return { success: true }
}
