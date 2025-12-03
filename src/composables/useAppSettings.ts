import { ref, watch } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

// 1. ОПРЕДЕЛЕНИЕ ПЛАТФОРМЫ
// Добавили ios, android, desktop (tauri), web
type Platform = 'ios' | 'android' | 'desktop' | 'web'

const getPlatform = (): Platform => {
  // @ts-ignore
  if (window.__TAURI__) return 'desktop'

  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'

  return 'web' // Обычный браузер на компе
}

// ------------------------------------------------------------------
// 2. ГЛОБАЛЬНЫЕ НАСТРОЙКИ (State)
// Хотите добавить тему? Добавьте: const theme = ref('dark')
// ------------------------------------------------------------------
const appVersion = ref('0.0.0')
const isOffline = ref(!navigator.onLine)

// === [НАСТРОЙКИ] ===
const isComfortMode = ref(true)
const uiScale = ref(110)
// const theme = ref('system') // Пример будущей настройки

// Собираем всё в один объект для удобства сохранения
const getSettingsSnapshot = () => ({
  isComfortMode: isComfortMode.value,
  uiScale: uiScale.value,
  // theme: theme.value
})

// Функция применения настроек, пришедших из облака
const applySettingsSnapshot = (data: any) => {
  if (!data) return

  if (data.isComfortMode !== undefined) isComfortMode.value = data.isComfortMode
  if (data.uiScale !== undefined) uiScale.value = data.uiScale
  // if (data.theme !== undefined) theme.value = data.theme

  // Применяем эффекты (масштаб, классы и т.д.)
  applyVisuals()
}
// ------------------------------------------------------------------

// Применение визуальных эффектов (CSS, DOM)
const applyVisuals = () => {
  document.documentElement.style.fontSize = `${16 * (uiScale.value / 100)}px`

  // Сохраняем локально, чтобы работало в оффлайне
  localStorage.setItem('fleeets_settings', JSON.stringify(getSettingsSnapshot()))
}

export function useAppSettings() {
  const { user } = useAuth()
  const currentPlatform = getPlatform()
  // @ts-ignore
  const isTauri = window.__TAURI__ !== undefined

  // --- ЛОГИКА ОБЛАКА ---
  let debounceTimer: any = null

  const saveCloud = () => {
    if (!user.value) return

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        // 1. Берем весь JSON из базы (чтобы не затереть настройки Android, сидя с iOS)
        const { data: existingData } = await supabase
          .from('user_settings')
          .select('preferences')
          .eq('user_id', user.value.id)
          .single()

        const allPreferences = existingData?.preferences || {}

        // 2. Обновляем ТОЛЬКО свою платформу
        allPreferences[currentPlatform] = getSettingsSnapshot()

        // 3. Сохраняем обратно
        await supabase.from('user_settings').upsert({
          user_id: user.value.id,
          preferences: allPreferences,
          updated_at: new Date(),
        })
        console.log(`Settings saved for [${currentPlatform}]`)
      } catch (e) {
        console.error('Save settings error:', e)
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
      // Берем настройки конкретно для ТЕКУЩЕЙ платформы
      const platformSettings = data.preferences[currentPlatform]

      // Если для этой платформы настроек еще нет (новый девайс),
      // можно попробовать взять 'web' как базу, или оставить дефолт.
      // Сейчас оставляем дефолт (или то, что было в localStorage).
      if (platformSettings) {
        applySettingsSnapshot(platformSettings)
      }
    }
  }
  // ---------------------

  const updateOnlineStatus = () => (isOffline.value = !navigator.onLine)

  const toggleLayout = () => {
    isComfortMode.value = !isComfortMode.value
    applyVisuals() // Применить + Сохранить локально
    saveCloud() // Отправить в облако
  }

  const initSettings = async () => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    try {
      appVersion.value = await getVersion()
    } catch {
      appVersion.value = 'Web'
    }

    // 1. Грузим из LocalStorage (мгновенно)
    const local = localStorage.getItem('fleeets_settings')
    if (local) {
      try {
        applySettingsSnapshot(JSON.parse(local))
      } catch (e) {
        console.error(e)
      }
    } else {
      // Фоллбэк для старых пользователей (миграция)
      // Можно удалить этот блок через пару обновлений
      const oldLayout = localStorage.getItem('fleeets_layout')
      if (oldLayout === 'full') isComfortMode.value = false
      const oldScale = localStorage.getItem('fleeets_scale')
      if (oldScale) {
        uiScale.value = Number(oldScale)
        applyVisuals()
      }
    }

    // 2. Грузим из Облака
    if (user.value) {
      await fetchCloudSettings()
    }
  }

  const cleanupSettings = () => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  }

  // ЕДИНЫЙ WATCHER: Следит за любым изменением настроек
  // Добавили новую настройку в массив? Она автоматически начнет сохраняться.
  watch([isComfortMode, uiScale], () => {
    applyVisuals()
    saveCloud()
  })

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
