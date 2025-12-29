'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import { useStore } from '@/lib/store'
import { finalizeLogin } from './auth-utils'
import { toast } from 'sonner'

export function useSocialAuth() {
  const [emailLoading, setEmailLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const setItems = useStore((state) => state.setItems)

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) toast.error(error.message)
  }

  const sendOtp = async (email: string) => {
    setEmailLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setEmailLoading(false)
    if (error) throw error
    return true
  }

  const verifyOtp = async (email: string, token: string) => {
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
      await finalizeLogin(supabase, setItems, router, data.session)
    }
    return true
  }

  return { emailLoading, handleGoogleLogin, sendOtp, verifyOtp }
}
