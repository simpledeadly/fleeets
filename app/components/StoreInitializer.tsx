// app/components/StoreInitializer.tsx
"use client"

import { useEffect } from 'react'
import { useStore, type Item } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

export default function StoreInitializer({ initialItems }: { initialItems: Item[] }) {
  const supabase = createClient()
  const { setItems, isInitialized } = useStore()

  // 1. ЗАГРУЗКА ДАННЫХ ПРИ СТАРТЕ (КЛИЕНТ)
  useEffect(() => {
    // Если уже инициализировано (например, при hot-reload) - выходим
    if (isInitialized) return

    const fetchInitialData = async () => {
      console.log("Fetching initial data...")
      const { data: items } = await supabase
        .from("items")
        .select("*")
        .in("status", ["inbox", "planned", "today"])

      setItems(items || [])
      console.log("Data fetched and set.")
    }

    fetchInitialData()
  }, [isInitialized, setItems, supabase])


  // 2. ПОДПИСКА НА REALTIME (с логами для дебага)
  useEffect(() => {
    console.log("Setting up realtime channel...")

    const channel = supabase
      .channel('items_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          console.log('Realtime payload received:', payload) // <-- ГЛАВНЫЙ ЛОГ
          if (payload.eventType === 'INSERT') {
            useStore.getState().addItem(payload.new as Item)
          }
          if (payload.eventType === 'UPDATE') {
            useStore.getState().updateItem(payload.new as Item)
          }
          if (payload.eventType === 'DELETE') {
            useStore.getState().removeItem((payload.old as { id: string }).id)
          }
        }
      )
      .subscribe((status, err) => {
        // Логируем статус подписки
        console.log(`Realtime status: ${status}`, err || '')
      })

    return () => {
      console.log("Removing realtime channel.")
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return null
}