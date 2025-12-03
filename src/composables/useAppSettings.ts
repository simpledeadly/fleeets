import { ref, watch } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

export function useAppSettings() {
  const { user } = useAuth()

  // @ts-ignore
  const isTauri = window.__TAURI__ !== undefined
  const appVersion = ref('0.0.0')
  const isComfortMode = ref(true)
  const uiScale = ref(115)
  const isOffline = ref(!navigator.onLine)

  // --- ЛОГИКА ОБЛАКА (НОВОЕ) ---
  let debounceTimer: any = null

  // Сохранение в Supabase (с задержкой 1 сек, чтобы не спамить базу)
  const saveCloud = () => {
    if (!user.value) return

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        await supabase.from('user_settings').upsert({
          user_id: user.value.id,
          preferences: {
            isComfortMode: isComfortMode.value,
            uiScale: uiScale.value,
          },
          updated_at: new Date(),
        })
      } catch (e) {
        console.error('Ошибка синхронизации настроек:', e)
      }
    }, 1000)
  }

  // Загрузка из Supabase
  const fetchCloudSettings = async () => {
    if (!user.value) return

    const { data } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.value.id)
      .single()

    if (data?.preferences) {
      // Применяем настройки, если они есть в облаке
      if (data.preferences.isComfortMode !== undefined) {
        isComfortMode.value = data.preferences.isComfortMode
        // Обновляем локальный кэш
        localStorage.setItem('fleeets_layout', isComfortMode.value ? 'comfort' : 'full')
      }

      if (data.preferences.uiScale !== undefined) {
        uiScale.value = data.preferences.uiScale
        // Применяем масштаб + обновляем локальный кэш внутри applyScale
        applyScale()
      }
    }
  }
  // -----------------------------

  const updateOnlineStatus = () => (isOffline.value = !navigator.onLine)

  const applyScale = () => {
    document.documentElement.style.fontSize = `${16 * (uiScale.value / 100)}px`
    localStorage.setItem('fleeets_scale', String(uiScale.value))
    saveCloud() // <-- Триггер сохранения в облако
  }

  const toggleLayout = () => {
    isComfortMode.value = !isComfortMode.value
    localStorage.setItem('fleeets_layout', isComfortMode.value ? 'comfort' : 'full')
    saveCloud() // <-- Триггер сохранения в облако
  }

  const initSettings = async () => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    try {
      appVersion.value = await getVersion()
    } catch {
      appVersion.value = 'Web'
    }

    // 1. Сначала грузим локально (чтобы интерфейс появился мгновенно)
    const savedLayout = localStorage.getItem('fleeets_layout')
    if (savedLayout === 'full') isComfortMode.value = false

    const savedScale = localStorage.getItem('fleeets_scale')
    if (savedScale) {
      uiScale.value = Number(savedScale)
      applyScale()
    }

    // 2. Если пользователь уже вошел — подтягиваем актуальное из облака
    if (user.value) {
      await fetchCloudSettings()
    }
  }

  const cleanupSettings = () => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  }

  watch(uiScale, applyScale)

  // Следим за юзером: как только вошли в аккаунт — тянем настройки
  watch(user, (newUser) => {
    if (newUser) fetchCloudSettings()
  })

  return {
    isTauri,
    appVersion,
    isComfortMode,
    uiScale,
    isOffline,
    toggleLayout,
    initSettings,
    cleanupSettings,
  }
}
