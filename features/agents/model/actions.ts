'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server' // Добавь этот импорт
import { Agent } from './store'

export async function fetchAgents(userId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .or(`user_id.eq.${userId},is_system.eq.true`)
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

/** Получить историю сессий Агента со всеми дебаг-данными */
export async function getAgentSessionHistory(agentId: string, limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('source', 'agent_adapter')
    .eq('details->>agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
