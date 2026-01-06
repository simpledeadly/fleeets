'use server'

import { createClient } from '../../../lib/supabase/server'
import { logEvent } from '@/lib/logging'

/**
 * Запись сессии таймера (Activity Log)
 */
export async function logFocusSession(itemId: string, durationSeconds: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Получаем теги для аналитики
  const { data: item } = await supabase
    .from('items')
    .select('ai_tags, content')
    .eq('id', itemId)
    .single()

  const endedAt = new Date()
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000)

  // Используем нашу общую систему событий. Она теперь умеет сама определять userId и контекст.
  await logEvent({
    itemId: itemId,
    eventType: 'focus.session',
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    meta: {
      duration_seconds: durationSeconds,
      tags: item?.ai_tags || [],
      item_content: item?.content,
    },
  })
}

/**
 * Оптимизированная загрузка данных для Фокуса (Batching)
 */
export async function getFocusViewData(itemId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { totalDuration: 0, similarItems: [] }

  const durationPromise = supabase.rpc('get_item_total_duration', {
    item_uuid: itemId,
  })

  const similarItemsPromise = (async () => {
    // Получаем эмбеддинг и текущий скоуп
    const { data: currentItem } = await supabase
      .from('items')
      .select('embedding, scope')
      .eq('id', itemId)
      .single()

    if (!currentItem?.embedding) return []

    const { data, error } = await supabase.rpc('match_items', {
      query_embedding: currentItem.embedding,
      match_threshold: 0.5,
      match_count: 11,
      user_id_input: user.id, // Теперь это снова совпадает с SQL
      filter_scope: currentItem.scope || 'general', // Ищем только в этом проекте
    })

    if (error) {
      console.error('Ошибка match_items:', error)
      return []
    }

    return data?.filter((i: any) => i.id !== itemId) || []
  })()

  const [durationResult, similarItems] = await Promise.all([
    durationPromise,
    similarItemsPromise,
  ])

  return {
    totalDuration: (durationResult.data as number) || 0,
    similarItems,
  }
}
