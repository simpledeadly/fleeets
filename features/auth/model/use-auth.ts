'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import { useStore } from '@/lib/store'
import { fetchActiveItems } from '@/lib/data'
import { toast } from 'sonner'

export function useAuth() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<
    'waiting' | 'success' | 'timeout' | 'error'
  >('waiting')
  const [emailLoading, setEmailLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const setItems = useStore((state) => state.setItems)

  // 1. Инициализация сессии (для Telegram)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessionId(crypto.randomUUID())
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Поллинг Telegram (вынесен в функцию для чистоты)
  useEffect(() => {
    if (!sessionId || status === 'success') return

    const startTime = Date.now()
    const MAX_POLLING_TIME = 1000 * 60 * 5

    const interval = setInterval(async () => {
      if (Date.now() - startTime > MAX_POLLING_TIME) {
        clearInterval(interval)
        setStatus('timeout')
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

        if (data.access_token) {
          clearInterval(interval)
          await finalizeLogin(data.access_token, data.refresh_token)
        }
      } catch (e) {
        console.error(e)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId, status])

  // Общая логика завершения входа
  const finalizeLogin = async (access_token: string, refresh_token: string) => {
    setStatus('success')
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })

    if (!error) {
      try {
        const items = await fetchActiveItems(supabase)
        setItems(items)
      } catch (e) {
        console.error('Prefetch error', e)
      }
      router.refresh()
      setTimeout(() => router.push('/'), 100)
    }
  }

  // --- EMAIL OTP ---
  const sendEmailOtp = async (email: string) => {
    setEmailLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setEmailLoading(false)
    if (error) throw error
    return true
  }

  const verifyEmailOtp = async (email: string, token: string) => {
    setEmailLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) {
      setEmailLoading(false)
      throw error
    }

    if (data.session) {
      await finalizeLogin(data.session.access_token, data.session.refresh_token)
    }
    return true
  }

  // --- GOOGLE ---
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (e: any) {
      toast.error('Ошибка Google: ' + e.message)
    }
  }

  return {
    sessionId,
    status,
    emailLoading,
    sendEmailOtp,
    verifyEmailOtp,
    handleGoogleLogin,
  }
}
