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
    let isStop = false

    // 1. Проверяем, есть ли сохраненная сессия (чтобы пережить перезагрузку PWA)
    let sessionId = localStorage.getItem('tg_session_id')

    // Если нет старой сессии, создаем новую
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('tg_session_id', sessionId!)
    }

    // 2. Функция опроса
    const poll = async () => {
      if (isStop || user.value) return

      try {
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

          // ЕСЛИ УСПЕХ
          if (data.access_token) {
            console.log('✅ Вход выполнен!')

            // Чистим хранилище, этот ID больше не нужен
            localStorage.removeItem('tg_session_id')

            await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            })

            const { data: u } = await supabase.auth.getUser()
            user.value = u.user
            await notesStore.fetchNotes()
            return
          }
        }
      } catch (e) {
        console.error('Poll error', e)
      }

      // Если не вышли и не остановили — повторяем
      if (!isStop) setTimeout(poll, 2000)
    }

    // 3. Запускаем опрос
    poll()

    // 4. ВАЖНО: Добавляем триггер "Проснуться"
    // Как только юзер переключается обратно на вкладку/PWA — сразу проверяем базу
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 App woke up, checking auth immediately...')
        poll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Функция остановки (чистим слушатели)
    const stop = () => {
      isStop = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // Если уходим со страницы входа руками — чистим ID, чтобы создать новый в след раз
      if (!user.value) {
        localStorage.removeItem('tg_session_id')
      }
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
