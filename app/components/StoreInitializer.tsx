"use client"

import { useEffect, useRef } from 'react'
import { useStore, type Item } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { fetchActiveItems, fetchUserTier } from '@/lib/data'
import { usePaywallStore } from '@/features/paywall'

export default function StoreInitializer() {
  const supabase = createClient()
  const { setItems, isInitialized, addItem, updateItem, removeItem } = useStore()

  // Ref чтобы не подписываться дважды при React Strict Mode
  const isMounted = useRef(false)

  // 1. ЗАГРУЗКА ДАННЫХ
  useEffect(() => {
    if (isInitialized) return

    const loadData = async () => {
      try {
        // Запускаем параллельно для скорости
        const [items, tier] = await Promise.all([
          fetchActiveItems(supabase),
          fetchUserTier(supabase)
        ])

        setItems(items)

        // Устанавливаем тариф в стор пэйволла
        usePaywallStore.getState().setTier(tier)
        console.log(`✅ Init complete. Items: ${items.length}, Tier: ${tier}`)
      } catch (e) {
        console.error("❌ Failed to load initial data", e)
      }
    }

    loadData()
  }, [isInitialized, setItems, supabase])


  // 2. REALTIME
  useEffect(() => {
    if (isMounted.current) return
    isMounted.current = true

    const channel = supabase
      .channel('items_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          const store = useStore.getState()

          if (payload.eventType === 'INSERT') {
            const realItem = payload.new as Item
            const exists = store.items.some(item => item.id === realItem.id)
            if (!exists) {
              store.addItem(realItem)
            }
          }
          if (payload.eventType === 'UPDATE') {
            store.updateItem(payload.new as Item)
          }
          if (payload.eventType === 'DELETE') {
            store.removeItem((payload.old as { id: string }).id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      isMounted.current = false
    }
  }, [supabase, addItem, updateItem, removeItem])

  return null
}