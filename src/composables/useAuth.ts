import { ref } from 'vue'
import { supabase } from '../supabase'
import { useNotesStore } from '../stores/notes'

const user = ref<any>(null)

export function useAuth() {
  const notesStore = useNotesStore()
  const emailLoading = ref(false)

  // Инициализация сессии при старте
  const initSession = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      user.value = data.session.user
      await notesStore.fetchNotes()
      return true
    }
    return false
  }

  // === НОВАЯ ЛОГИКА: REALTIME LOGIN ===
  // Возвращает sessionId, на который нужно подписаться
  const startRealtimeAuth = () => {
    // 1. Генерируем уникальный UUID для этой попытки входа
    const sessionId = crypto.randomUUID()

    // 2. Подписываемся на канал
    const channel = supabase.channel(`auth:${sessionId}`)

    channel
      .on('broadcast', { event: 'login_token' }, async ({ payload }) => {
        console.log('⚡️ Realtime Login Received!')

        // 3. Получили токены — логинимся
        if (payload.access_token && payload.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: payload.access_token,
            refresh_token: payload.refresh_token,
          })

          if (!error) {
            user.value = payload.user
            await notesStore.fetchNotes()
            // Отписываемся, дело сделано
            supabase.removeChannel(channel)
          }
        }
      })
      .subscribe()

    return sessionId
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
    startRealtimeAuth,
    handleEmailLogin,
    logout,
  }
}
