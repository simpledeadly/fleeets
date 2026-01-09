'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useStore, type Item } from '@/lib/store'
import { createClient } from '../../lib/supabase/client'
import { fetchActiveItems, fetchUserTier } from '@/lib/data'
import { usePaywallStore } from '@/features/paywall'
import { fetchAgents, useAgentsStore } from '@/features/agents'
import { useScopeStore } from '@/features/scopes'

export default function StoreInitializer() {
  const supabase = useMemo(() => createClient(), [])
  const { isInitialized, setItems, addItem } = useStore()
  const { setActiveScope, setScopes } = useScopeStore()

  // Ref чтобы не подписываться дважды при React Strict Mode
  const isMounted = useRef(false)

  // 1. ЗАГРУЗКА ДАННЫХ
  useEffect(() => {
    if (isInitialized) return

    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('active_scope_id')
          .eq('id', user.id)
          .single()
        const { data: scopes } = await supabase
          .from('scopes')
          .select('*')
          .eq('user_id', user.id)

        // Определяем текущий скоуп
        const scopeList = scopes || []
        setScopes(scopeList) // Сохраняем в стор

        // Определяем текущий
        const activeId = profile?.active_scope_id
        const currentScope =
          scopeList.find((s) => s.id === activeId) || scopeList[0]

        if (currentScope) {
          setActiveScope(currentScope) // Устанавливаем активный (ESLint доволен)
        }

        const [items, tier, agents] = await Promise.all([
          fetchActiveItems(supabase, currentScope?.id),
          fetchUserTier(supabase),
          fetchAgents(user.id),
        ])

        setItems(items)
        usePaywallStore.getState().setTier(tier)
        useAgentsStore.getState().setAgents(agents)

        console.log(
          `✅ Init complete. Items: ${items.length}, Agents: ${agents.length}`
        )
      } catch (e) {
        console.error('❌ Failed to load initial data', e)
      }
    }

    loadData()
  }, [isInitialized, setItems, supabase, setActiveScope, setScopes])

  // 2. REALTIME
  useEffect(() => {
    if (isMounted.current) return
    isMounted.current = true

    console.log('🔌 Connecting to partial realtime...')

    const channel = supabase
      .channel('items_realtime')
      .on(
        'postgres_changes',
        // 👇 СЛУШАЕМ ТОЛЬКО INSERT (Новые задачи из ТГ/других устройств)
        { event: 'INSERT', schema: 'public', table: 'items' },
        (payload) => {
          const store = useStore.getState()
          const scopeStore = useScopeStore.getState()
          const realItem = payload.new as Item

          if (
            scopeStore.activeScope &&
            realItem.scope_id !== scopeStore.activeScope.id
          ) {
            return
          }

          // Защита от дублей (если мы сами создали задачу через CaptureBar)
          const exists = store.items.some((item) => item.id === realItem.id)
          if (!exists) {
            console.log('📨 Incoming item from external source', realItem.id)
            store.addItem(realItem)
          }
        }
      )
      // УДАЛИЛИ UPDATE И DELETE
      // Теперь серверное эхо не будет дергать твой интерфейс.
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      isMounted.current = false
    }
  }, [supabase, addItem])

  return null
}
