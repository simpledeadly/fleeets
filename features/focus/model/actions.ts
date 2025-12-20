'use server'

import { createClient } from '@/lib/supabase/server'
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

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    source: 'fleeets_web',
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    category: 'deep_work',
    details: {
      item_id: itemId,
      tags: item?.ai_tags || [],
    },
  })

  // Также пишем в нашу общую систему событий для единообразия
  if (!error) {
    await logEvent({
      userId: user.id,
      itemId: itemId,
      eventType: 'focus.session',
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      meta: {
        duration_seconds: durationSeconds, // Дублируем в meta для удобства JSON
        tags: item?.ai_tags || [],
        item_content: item?.content,
      },
    })
  }
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

  // Запускаем запросы параллельно используя один инстанс клиента

  // 1. Время
  const durationPromise = supabase.rpc('get_item_total_duration', {
    item_uuid: itemId,
  })

  // 2. Контекст (RAG)
  const similarItemsPromise = (async () => {
    // Сначала нужен вектор
    const { data: currentItem } = await supabase
      .from('items')
      .select('embedding')
      .eq('id', itemId)
      .single()

    if (!currentItem?.embedding) return []

    const { data } = await supabase.rpc('match_items', {
      query_embedding: currentItem.embedding,
      match_threshold: 0.5,
      match_count: 10,
      user_id_input: user.id,
    })

    // Фильтруем саму себя
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
