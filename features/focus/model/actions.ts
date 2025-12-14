'use server'

import { findSimilarItems } from '@/features/ai'
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
  const [totalDuration, similarItems] = await Promise.all([
    getItemTotalDuration(itemId),
    findSimilarItems(itemId),
  ])
  return { totalDuration, similarItems }
}
