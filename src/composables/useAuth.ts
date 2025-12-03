import { ref } from 'vue'
import { supabase } from '../supabase'
import { useNotesStore } from '../stores/notes'

const user = ref<any>(null)

// ВАЖНО: Вставьте сюда ваш URL проекта Supabase (без /funcions/v1...)
// Я взял его из вашего лога, но перепроверьте
const SUPABASE_PROJECT_URL = 'https://euarsaudarjevvhttwpv.supabase.co'

export function useAuth() {
  const notesStore = useNotesStore()
  const emailLoading = ref(false)

  const initSession = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      user.value = data.session.user
      await notesStore.fetchNotes()
      return true
    }
    return false
  }

  const handleTelegramLogin = async (tgUser: any): Promise<boolean> => {
    try {
      // === ИСПРАВЛЕНИЕ ДЛЯ iOS ===
      // Используем нативный fetch вместо supabase.functions.invoke
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/telegram-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Используем Anon Key, так как пользователь еще не авторизован
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
        },
        body: JSON.stringify({ user: tgUser }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Server error ${response.status}: ${errText}`)
      }

      const data = await response.json()

      if (data?.session || data?.access_token) {
        const s = data.session || data
        await supabase.auth.setSession({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
        })
        const { data: u } = await supabase.auth.getUser()
        user.value = u.user
        await notesStore.fetchNotes()
        return true
      }
    } catch (e: any) {
      console.error('Auth error:', e)
      // Можно раскомментировать алерт для отладки, если нужно
      alert('Ошибка входа: ' + e.message)
    }
    return false
  }

  const handleEmailLogin = async (email: string) => {
    emailLoading.value = true
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    emailLoading.value = false
    if (error) alert('Ошибка: ' + error.message)
    else alert(`Ссылка отправлена на ${email}`)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    user.value = null
  }

  return {
    user,
    emailLoading,
    initSession,
    handleTelegramLogin,
    handleEmailLogin,
    logout,
  }
}
