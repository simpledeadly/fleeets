'use server'

import { createClient } from '@/lib/supabase/server'

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
