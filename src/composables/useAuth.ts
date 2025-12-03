import { ref } from 'vue'
import { supabase } from '../supabase'
import { useNotesStore } from '../stores/notes'

const user = ref<any>(null)
// URL вашего проекта Supabase
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

  // === НОВЫЙ МЕТОД: POLL LOGIN (Работает везде) ===
  const startPollingAuth = async () => {
    // 1. Генерируем UUID
    const sessionId = crypto.randomUUID()
    let isStop = false

    // 2. Функция опроса сервера
    const poll = async () => {
      if (isStop || user.value) return

      try {
        // Спрашиваем функцию: "Есть токены для этой сессии?"
        const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/telegram-auth-poll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        })

        if (response.ok) {
          const data = await response.json()

          // ЕСЛИ ТОКЕНЫ ПРИШЛИ
          if (data.access_token) {
            console.log('✅ Токены получены через Polling!')

            await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            })

            const { data: u } = await supabase.auth.getUser()
            user.value = u.user
            await notesStore.fetchNotes()
            return // Успех
          }
        }
      } catch (e) {
        console.error('Poll error', e)
      }

      // Если пока нет - повторяем через 2 секунды
      if (!isStop) setTimeout(poll, 2000)
    }

    // Запускаем опрос
    poll()

    // Функция отмены (если юзер ушел со страницы)
    const stop = () => {
      isStop = true
    }

    return { sessionId, stop }
  }

  // === ИСПРАВЛЕННЫЙ ВЫХОД (ЯДЕРНЫЙ) ===
  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Logout error', e)
    } finally {
      // Принудительная зачистка всего, чтобы наверняка
      localStorage.clear()
      sessionStorage.clear()
      user.value = null

      // Жесткая перезагрузка страницы для очистки состояния Vue
      window.location.reload()
    }
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

  return {
    user,
    emailLoading,
    initSession,
    startPollingAuth, // <-- Новый метод
    logout, // <-- Исправленный метод
    handleEmailLogin,
  }
}
