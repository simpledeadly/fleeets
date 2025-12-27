'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import { finalizeLogin } from './auth-utils'

export function useTelegramAuth() {
  // 1. ИСПРАВЛЕНИЕ ГИДРАТАЦИИ:
  // Инициализируем null, генерируем только на клиенте
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [status, setStatus] = useState<
    'loading' | 'waiting' | 'success' | 'timeout'
  >('waiting')
  const router = useRouter()
  const supabase = createClient()
  const setItems = useStore((state) => state.setItems)

  // Генерация ID при монтировании
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessionId(crypto.randomUUID())
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Полллинг
  useEffect(() => {
    if (!sessionId) return

    const startTime = Date.now()
    const MAX_POLLING_TIME = 1000 * 60 * 2 // 5 минут макс

    const interval = setInterval(async () => {
      if (Date.now() - startTime > MAX_POLLING_TIME) {
        clearInterval(interval)
        setStatus('timeout') // Можно добавить такое состояние в UI
        return
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/telegram-auth-poll`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          }
        )

        if (!res.ok) return
        const data = await res.json()

        if (data.access_token && data.refresh_token) {
          clearInterval(interval)
          setStatus('success')

          // А. Устанавливаем сессию
          const { error } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          })

          if (!error) {
            await finalizeLogin(supabase, setItems, router, {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            })
          }
        }
      } catch (e) {
        console.error(e)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId, router, supabase, setItems])

  return { sessionId, status }
}
