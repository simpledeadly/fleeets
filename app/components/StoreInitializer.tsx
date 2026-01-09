'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Item, useStore } from '@/lib/store'
import { createClient } from '../../lib/supabase/client'
import { fetchActiveItems, fetchUserTier } from '@/lib/data'
import { usePaywallStore } from '@/features/paywall'
import { fetchAgents, useAgentsStore } from '@/features/agents'
import { useScopeStore } from '@/features/scopes/model/store'

export default function StoreInitializer() {
  const supabase = useMemo(() => createClient(), [])
  const { setItems, addItem, setIsInitialized } = useStore()
  const { setActiveScope, setScopes, activeScope } = useScopeStore()

  // Флаги состояния для предотвращения двойных вызовов
  const isBootstrapped = useRef(false)
  const lastFetchedScopeId = useRef<string | null>(null)

  // 1. ЕДИНАЯ "ХОЛОДНАЯ" ИНИЦИАЛИЗАЦИЯ (PARALLEL FETCH)
  useEffect(() => {
    if (isBootstrapped.current) return
    isBootstrapped.current = true // Блокируем повторный запуск в StrictMode

    const bootstrap = async () => {
      console.time('⚡️ App Bootstrap')
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // А. Запускаем независимые запросы параллельно
        const tierPromise = fetchUserTier(supabase)
        const agentsPromise = fetchAgents(user.id)
        const profilePromise = supabase
          .from('profiles')
          .select('active_scope_id')
          .eq('id', user.id)
          .single()
        const scopesPromise = supabase
          .from('scopes')
          .select('*')
          .eq('user_id', user.id)
          .order('name')

        // Б. Ждем критические данные для определения контекста (Профиль + Скоупы)
        const [profileRes, scopesRes] = await Promise.all([
          profilePromise,
          scopesPromise,
        ])

        // В. Определяем активный скоуп СРАЗУ (без рендера)
        const scopeList = scopesRes.data || []
        const activeId = profileRes.data?.active_scope_id
        const currentScope =
          scopeList.find((s: any) => s.id === activeId) || scopeList[0]

        // Г. Запускаем загрузку задач для этого скоупа (не дожидаясь рендера!)
        const itemsPromise = currentScope
          ? fetchActiveItems(supabase, currentScope.id)
          : Promise.resolve([])

        // Д. Ждем вообще всё
        const [tier, agents, items] = await Promise.all([
          tierPromise,
          agentsPromise,
          itemsPromise,
        ])

        // Е. Обновляем все сторы ОДНИМ МАХОМ (Batch Update)
        // Это вызывает только один ре-рендер вместо пяти
        usePaywallStore.getState().setTier(tier)
        useAgentsStore.getState().setAgents(agents)
        setScopes(scopeList)

        if (currentScope) {
          setActiveScope(currentScope)
          lastFetchedScopeId.current = currentScope.id // Запоминаем, что для него уже загрузили
        }

        setItems(items)
        setIsInitialized(true)

        console.timeEnd('⚡️ App Bootstrap')
      } catch (e) {
        console.error('❌ Bootstrap failed', e)
      }
    }

    bootstrap()
  }, [supabase, setScopes, setActiveScope, setItems, setIsInitialized])

  // 2. РЕАКТИВНОЕ ПЕРЕКЛЮЧЕНИЕ (Только если юзер кликнул в меню)
  useEffect(() => {
    // Если еще не загрузились или скоуп не выбран — выходим
    if (!activeScope || !isBootstrapped.current) return

    // Если мы уже загрузили данные для этого скоупа (например, при инициализации) — выходим
    if (activeScope.id === lastFetchedScopeId.current) return

    const switchScope = async () => {
      console.log(`🔄 Switching items to: ${activeScope.name}`)
      try {
        lastFetchedScopeId.current = activeScope.id
        const targetScopeId =
          activeScope.slug === 'general' ? null : activeScope.id

        const items = await fetchActiveItems(supabase, targetScopeId)
        setItems(items)
      } catch (e) {
        console.error('❌ Switch failed', e)
      }
    }

    switchScope()
  }, [activeScope, supabase, setItems])

  // 3. REALTIME (Только для текущего скоупа)
  useEffect(() => {
    if (!activeScope) return

    const channelName =
      activeScope.slug === 'general'
        ? `items_global_user`
        : `items_realtime_${activeScope.id}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items' },
        (payload) => {
          const realItem = payload.new as Item

          // ФИЛЬТР REALTIME:
          // 1. Если мы в General -> принимаем ВСЁ (так как это глобальный вид)
          // 2. Если мы в Проекте -> принимаем только если совпадает ID
          const isGlobalView = activeScope.slug === 'general'
          const isBelongToScope = realItem.scope_id === activeScope.id

          if (isGlobalView || isBelongToScope) {
            const store = useStore.getState()
            if (!store.items.some((i) => i.id === realItem.id)) {
              store.addItem(realItem)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeScope, supabase, addItem])

  return null
}
