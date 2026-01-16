'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Item, useStore } from '@/lib/store'
import { createClient } from '../../lib/supabase/client'
import { fetchActiveItems, fetchUserTier } from '@/lib/data'
import { usePaywallStore } from '@/features/paywall'
import { fetchAgents, useAgentsStore } from '@/features/agents'
import { useScopeStore } from '@/features/scopes/model/store'

interface StoreInitializerProps {
  initialScopes?: any[]
  initialActiveScopeId?: string | null
}

export default function StoreInitializer({
  initialScopes,
  initialActiveScopeId,
}: StoreInitializerProps) {
  const supabase = useMemo(() => createClient(), [])
  const { setItems, addItem, setIsInitialized } = useStore()
  const {
    setActiveScope,
    setScopes,
    activeScope,
    setIsLoading: setScopeLoading,
  } = useScopeStore()

  // Флаги состояния для предотвращения двойных вызовов
  const isBootstrapped = useRef(false)
  const lastFetchedScopeId = useRef<string | null>(initialActiveScopeId || null)

  // 1. ЕДИНАЯ "ХОЛОДНАЯ" ИНИЦИАЛИЗАЦИЯ (PARALLEL FETCH)
  useMemo(() => {
    // [ABSOLUTE FIX] Применяем данные с сервера МГНОВЕННО (синхронно до рендера),
    // чтобы не было даже одного мига прыжка "General -> Project".
    if (initialScopes && !isBootstrapped.current) {
      useScopeStore.getState().setScopes(initialScopes)
      const current = initialActiveScopeId
        ? initialScopes.find((s) => s.id === initialActiveScopeId)
        : null
      if (current) useScopeStore.getState().setActiveScope(current)
    }
  }, [initialScopes, initialActiveScopeId])

  useEffect(() => {
    if (isBootstrapped.current) return
    isBootstrapped.current = true

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
        const currentScope = activeId
          ? scopeList.find((s: any) => s.id === activeId)
          : null // If no active project, we are in General scope

        let targetId = null

        if (currentScope && currentScope.slug !== 'general') {
          targetId = currentScope.id
        }

        const itemsPromise = fetchActiveItems(supabase, targetId)

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
        setScopeLoading(false)

        console.timeEnd('⚡️ App Bootstrap')
      } catch (e) {
        console.error('❌ Bootstrap failed', e)
      }
    }

    bootstrap()
  }, [supabase, setScopes, setActiveScope, setItems, setIsInitialized])

  // 2. РЕАКТИВНОЕ ПЕРЕКЛЮЧЕНИЕ (Только если юзер кликнул в меню)
  useEffect(() => {
    if (!activeScope || !isBootstrapped.current) return
    if (activeScope.id === lastFetchedScopeId.current) return

    const switchScope = async () => {
      console.log(`🔄 Switching items to: ${activeScope.name}`)

      useScopeStore.getState().setIsSwitching(true)

      try {
        lastFetchedScopeId.current = activeScope.id
        const targetScopeId =
          activeScope.slug === 'general' ? null : activeScope.id

        const items = await fetchActiveItems(supabase, targetScopeId)
        setItems(items)
      } catch (e) {
        console.error('❌ Switch failed', e)
      } finally {
        useScopeStore.getState().setIsSwitching(false)
      }
    }

    switchScope()
  }, [activeScope, supabase, setItems])

  // 3. REALTIME (Removed in favor of Optimistic UI)
  // Realtime listeners for items are removed for reliability and performance.

  return null
}
