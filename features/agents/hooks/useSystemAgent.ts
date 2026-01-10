'use client'

import { useAgentsStore } from '@/features/agents'
import { useUser } from '@/features/auth'

export function useSystemAgent(slug: string) {
  const { agents } = useAgentsStore()
  const { user } = useUser()

  if (!user) return null

  // 1. Ищем ЛИЧНОГО агента с таким слагом (Приоритет)
  const myOverride = agents.find(
    (a) => a.slug === slug && a.user_id === user.id
  )

  // 2. Если нет, ищем СИСТЕМНОГО
  const systemAgent = agents.find((a) => a.slug === slug && a.is_system)

  return myOverride?.id || systemAgent?.id
}
