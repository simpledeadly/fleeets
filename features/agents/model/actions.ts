'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server' // Добавь этот импорт
import { Agent } from './useAgentsStore'

export async function fetchAgents(userId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Agent[]
}

export async function upsertAgent(agent: Partial<Agent>) {
  // 1. Получаем текущего пользователя на сервере
  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const supabaseAdmin = await createAdminClient()

  // 2. Принудительно вставляем user_id из сессии
  const agentWithUser = {
    ...agent,
    user_id: user.id,
  }

  const { data, error } = await supabaseAdmin
    .from('agents')
    .upsert(agentWithUser)
    .select()
    .single()

  if (error) {
    console.error('Upsert Error:', error)
    throw error
  }

  return data as Agent
}

export async function deleteAgent(agentId: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase.from('agents').delete().eq('id', agentId)
  if (error) throw error
  return { success: true }
}
