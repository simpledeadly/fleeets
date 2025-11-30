import { ref, watch } from 'vue'
import { getVersion } from '@tauri-apps/api/app'

export function useAppSettings() {
  // @ts-ignore
  const isTauri = window.__TAURI__ !== undefined
  const appVersion = ref('0.0.0')
  const isComfortMode = ref(true)
  const uiScale = ref(110)
  const isOffline = ref(!navigator.onLine)

  const updateOnlineStatus = () => (isOffline.value = !navigator.onLine)

  const applyScale = () => {
    document.documentElement.style.fontSize = `${16 * (uiScale.value / 100)}px`
    localStorage.setItem('fleeets_scale', String(uiScale.value))
  }

  const toggleLayout = () => {
    isComfortMode.value = !isComfortMode.value
    localStorage.setItem('fleeets_layout', isComfortMode.value ? 'comfort' : 'full')
  }

  const initSettings = async () => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    try {
      appVersion.value = await getVersion()
    } catch {
      appVersion.value = 'Web'
    }

    const savedLayout = localStorage.getItem('fleeets_layout')
    if (savedLayout === 'full') isComfortMode.value = false

    const savedScale = localStorage.getItem('fleeets_scale')
    if (savedScale) {
      uiScale.value = Number(savedScale)
      applyScale()
    }
  }

  const cleanupSettings = () => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  }

  watch(uiScale, applyScale)

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
