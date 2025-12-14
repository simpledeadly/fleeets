"use client"

import { useEffect, useRef } from 'react'
import { useStore, type Item } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { fetchActiveItems, fetchUserTier } from '@/lib/data'
import { usePaywallStore } from '@/features/paywall'

export default function StoreInitializer({ initialItems }: { initialItems: Item[] }) {
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

      } catch (e) {
        console.error("Failed to load initial data", e)
      }
    }

    loadData()
  }, [isInitialized, setItems, supabase])


  // 2. REALTIME
  useEffect(() => {
    if (isMounted.current) return
    isMounted.current = true

    console.log("📡 Setting up realtime...")

    const channel = supabase
      .channel('items_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          // console.log('Realtime:', payload) 
          if (payload.eventType === 'INSERT') addItem(payload.new as Item)
          if (payload.eventType === 'UPDATE') updateItem(payload.new as Item)
          if (payload.eventType === 'DELETE') removeItem((payload.old as { id: string }).id)
        }
      )
      .subscribe()

    return () => {
      console.log("🔕 Removing channel")
      supabase.removeChannel(channel)
      isMounted.current = false
    }
  }, [supabase, addItem, updateItem, removeItem])

  return null
}