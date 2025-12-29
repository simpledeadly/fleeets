'use client'

import { useEffect, useRef } from 'react'
import { useStore, type Item } from '@/lib/store'
import { createClient } from '../../lib/supabase/client'
import { fetchActiveItems, fetchUserTier } from '@/lib/data'
import { usePaywallStore } from '@/features/paywall'

export default function StoreInitializer() {
  const supabase = createClient()
  const { isInitialized, setItems, addItem } = useStore()

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
          fetchUserTier(supabase),
        ])

        setItems(items)

        // Устанавливаем тариф в стор пэйволла
        usePaywallStore.getState().setTier(tier)
        console.log(`✅ Init complete. Items: ${items.length}, Tier: ${tier}`)
      } catch (e) {
        console.error('❌ Failed to load initial data', e)
      }
    }

    loadData()
  }, [isInitialized, setItems, supabase])

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
          const realItem = payload.new as Item

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
