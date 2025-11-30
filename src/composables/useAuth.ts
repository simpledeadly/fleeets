import { ref } from 'vue'
import { supabase } from '../supabase'
import { useNotesStore } from '../stores/notes'

const user = ref<any>(null)

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
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { user: tgUser },
      })
      if (error) throw error
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
      alert('Ошибка: ' + e.message)
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
