import { ref, watch } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

// Помощник для определения платформы
const getPlatform = (): 'mobile' | 'desktop' => {
  // @ts-ignore
  if (window.__TAURI__) return 'desktop'

  const ua = navigator.userAgent.toLowerCase()
  if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

export function useAppSettings() {
  const { user } = useAuth()
  const currentPlatform = getPlatform() // 'mobile' или 'desktop'

  // @ts-ignore
  const isTauri = window.__TAURI__ !== undefined
  const appVersion = ref('0.0.0')
  const isComfortMode = ref(true)
  const uiScale = ref(110)
  const isOffline = ref(!navigator.onLine)

  let debounceTimer: any = null

  // --- ЛОГИКА ОБЛАКА (ОБНОВЛЕНАЯ) ---

  // Сохраняем ТОЛЬКО для текущей платформы, не ломая другую
  const saveCloud = () => {
    if (!user.value) return

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        // 1. Сначала получаем текущий JSON из базы (чтобы не стереть настройки другой платформы)
        const { data: existingData } = await supabase
          .from('user_settings')
          .select('preferences')
          .eq('user_id', user.value.id)
          .single()

        // Берем существующий объект или создаем пустой
        const allPreferences = existingData?.preferences || {}

        // 2. Обновляем ветку только текущей платформы
        allPreferences[currentPlatform] = {
          isComfortMode: isComfortMode.value,
          uiScale: uiScale.value,
        }

        // 3. Записываем обратно полный объект
        await supabase.from('user_settings').upsert({
          user_id: user.value.id,
          preferences: allPreferences,
          updated_at: new Date(),
        })
      } catch (e) {
        console.error('Ошибка сохранения настроек:', e)
      }
    }, 1000)
  }

  const fetchCloudSettings = async () => {
    if (!user.value) return

    const { data } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.value.id)
      .single()

    if (data?.preferences) {
      const prefs = data.preferences

      // 1. Ищем настройки конкретно для нашей платформы (mobile/desktop)
      const platformPrefs = prefs[currentPlatform]

      if (platformPrefs) {
        // Если нашли — применяем
        if (platformPrefs.isComfortMode !== undefined)
          isComfortMode.value = platformPrefs.isComfortMode
        if (platformPrefs.uiScale !== undefined) uiScale.value = platformPrefs.uiScale
      } else {
        // МИГРАЦИЯ: Если платформенных настроек нет, но есть старые "плоские" (от прошлой версии)
        // можно попробовать применить их как фоллбэк
        if (typeof prefs.isComfortMode === 'boolean') isComfortMode.value = prefs.isComfortMode
        if (typeof prefs.uiScale === 'number') uiScale.value = prefs.uiScale
      }

      // Применяем локально (обновит localStorage и стили)
      applyScale()

      // Обновляем localStorage для layout
      localStorage.setItem('fleeets_layout', isComfortMode.value ? 'comfort' : 'full')
    }
  }
  // -----------------------------

  const updateOnlineStatus = () => (isOffline.value = !navigator.onLine)

  const applyScale = () => {
    document.documentElement.style.fontSize = `${16 * (uiScale.value / 100)}px`
    // LocalStorage остается уникальным для каждого браузера, так что ключи можно не менять
    localStorage.setItem('fleeets_scale', String(uiScale.value))
    saveCloud()
  }

  const toggleLayout = () => {
    isComfortMode.value = !isComfortMode.value
    localStorage.setItem('fleeets_layout', isComfortMode.value ? 'comfort' : 'full')
    saveCloud()
  }

  const initSettings = async () => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    try {
      appVersion.value = await getVersion()
    } catch {
      appVersion.value = 'Web'
    }

    // 1. Грузим локально
    const savedLayout = localStorage.getItem('fleeets_layout')
    if (savedLayout === 'full') isComfortMode.value = false

    const savedScale = localStorage.getItem('fleeets_scale')
    if (savedScale) {
      uiScale.value = Number(savedScale)
      applyScale()
    }

    // 2. Грузим из облака (с учетом платформы)
    if (user.value) {
      await fetchCloudSettings()
    }
  }

  const cleanupSettings = () => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  }

  watch(uiScale, applyScale)

  // Следим за юзером
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
