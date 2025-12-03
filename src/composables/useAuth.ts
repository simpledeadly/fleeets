import { ref } from 'vue'
import { supabase } from '../supabase'
import { useNotesStore } from '../stores/notes'

const user = ref<any>(null)
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

  const startPollingAuth = async () => {
    let isStop = false

    // Получаем или создаем ID
    let sessionId = localStorage.getItem('tg_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('tg_session_id', sessionId!)
    }

    // Функция проверки (вынесли отдельно, чтобы вызывать вручную)
    const checkAuth = async () => {
      if (user.value) return true

      try {
        // Добавляем timestamp, чтобы iOS не кэшировал запрос
        const ts = Date.now()
        const response = await fetch(
          `${SUPABASE_PROJECT_URL}/functions/v1/telegram-auth-poll?t=${ts}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
            },
            body: JSON.stringify({ session_id: sessionId }),
          }
        )

        if (response.ok) {
          const data = await response.json()

          if (data.access_token) {
            console.log('✅ Вход выполнен!')
            localStorage.removeItem('tg_session_id')

            await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            })

            const { data: u } = await supabase.auth.getUser()
            user.value = u.user
            await notesStore.fetchNotes()
            return true
          }
        }
      } catch (e: any) {
        console.error('Check error', e)
      }
      return false
    }

    // Автоматический опрос
    const poll = async () => {
      if (isStop) return
      const success = await checkAuth()
      if (!success && !isStop) setTimeout(poll, 2000)
    }

    poll()

    // Просыпание на iOS
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 App woke up. Starting burst check...')

        // Делаем серию проверок с разной задержкой, чтобы поймать момент,
        // когда сеть поднимется или вебхук допишет данные.

        // 1. Мгновенно
        checkAuth()

        // 2. Через 500мс (сеть проснулась)
        setTimeout(checkAuth, 500)

        // 3. Через 1.5 сек (вебхук проснулся и записал)
        setTimeout(checkAuth, 1500)

        // 4. Через 3 сек (на всякий случай)
        setTimeout(checkAuth, 3000)

        // Перезапускаем основной цикл опроса, если он умер
        if (!isStop) poll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const stop = () => {
      isStop = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (!user.value) localStorage.removeItem('tg_session_id')
    }

    // Экспортируем checkAuth наружу, чтобы повесить на кнопку
    return { sessionId, stop, checkAuth }
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
      notesStore.clearNotes()
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

  // --- EMAIL OTP LOGIC (ОБНОВЛЕНО) ---

  // 1. Отправка кода
  const sendEmailOtp = async (email: string) => {
    emailLoading.value = true
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // ВАЖНО: Мы не шлем редирект, мы надеемся что юзер введет код
    })
    emailLoading.value = false
    if (error) throw error
    return true
  }

  // 2. Проверка кода
  const verifyEmailOtp = async (email: string, token: string) => {
    emailLoading.value = true
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) {
      emailLoading.value = false
      throw error
    }

    if (data.session) {
      user.value = data.user
      await notesStore.fetchNotes()
    }
    emailLoading.value = false
    return true
  }

  // === ВХОД ЧЕРЕЗ GOOGLE ===
  const handleGoogleLogin = async () => {
    try {
      // Supabase сам разрулит редиректы
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Куда вернуться после входа.
          // window.location.origin вернет текущий адрес (https://fleeets.vercel.app или localhost)
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (e: any) {
      alert('Ошибка Google: ' + e.message)
    }
  }

  return {
    user,
    emailLoading,
    initSession,
    startPollingAuth,
    logout,
    handleEmailLogin,
    sendEmailOtp,
    verifyEmailOtp,
    handleGoogleLogin,
  }
}
