'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateExecutionLog(itemId: string, text: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('items')
    .update({ execution_log: text })
    .eq('id', itemId)

  if (error) {
    console.error('Log update failed:', error)
    return { error: error.message }
  }

  // revalidatePath не обязателен, если мы не обновляем список,
  // но полезен для синхронизации
  return { success: true }
}

export async function logFocusSession(itemId: string, durationSeconds: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const endedAt = new Date()
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000)

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    source: 'fleeets_web',
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    category: 'deep_work',
    details: { item_id: itemId },
  })

  if (error) console.error('Session log error:', error)
}

export async function getItemTotalDuration(itemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_item_total_duration', {
    item_uuid: itemId,
  })

  if (error) {
    console.error(error)
    return 0
  }

  return data as number // Возвращает секунды
}

export async function completeItem(itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('items')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (error) return { error: error.message }

  revalidatePath('/') // Обновляем списки
  return { success: true }
}

export async function getFocusViewData(itemId: string) {
  // 1. Инициализация (ОДИН РАЗ)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { totalDuration: 0, similarItems: [] }

  // 2. Подготовка запросов (используем тот же клиент)

  // Запрос А: Время (сразу отправляем промис)
  const durationPromise = supabase.rpc('get_item_total_duration', {
    item_uuid: itemId,
  })

  // Запрос Б: Похожие элементы (немного сложнее, т.к. нужно сначала достать вектор)
  const similarItemsPromise = (async () => {
    // 2.1 Получаем вектор текущей задачи
    const { data: currentItem } = await supabase
      .from('items')
      .select('embedding')
      .eq('id', itemId)
      .single()

    if (!currentItem?.embedding) return []

    // 2.2 Ищем похожие
    const { data } = await supabase.rpc('match_items', {
      query_embedding: currentItem.embedding,
      match_threshold: 0.5,
      match_count: 10,
      user_id_input: user.id,
    })

    // Фильтруем саму себя
    return data?.filter((i: any) => i.id !== itemId) || []
  })()

  // 3. Ждем выполнения всех запросов параллельно
  const [durationResult, similarItems] = await Promise.all([
    durationPromise,
    similarItemsPromise,
  ])

  return {
    totalDuration: (durationResult.data as number) || 0,
    similarItems,
  }
}
