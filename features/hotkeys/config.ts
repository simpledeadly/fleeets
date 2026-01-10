import { useStore } from '@/lib/store'
import { useOmniStore } from '@/features/omni'
import { useScopeStore } from '../scopes'
import { useQuickCaptureStore } from '../capture'

type HotkeyAction = (e: KeyboardEvent) => void

export const HOTKEY_MAP: Record<
  string,
  { label: string; action: HotkeyAction }
> = {
  'mod+k': {
    label: 'Открыть Omni',
    action: (e) => {
      e?.preventDefault()
      const { isPaletteOpen, closePalette, openPalette } =
        useOmniStore.getState()
      if (isPaletteOpen) closePalette()
      else openPalette()
    },
  },
  'mod+j': {
    label: 'Фокус на Capture Bar',
    action: (e) => {
      e.preventDefault()
      const input = document.getElementById(
        'capture-bar-input'
      ) as HTMLInputElement
      input?.focus()
    },
  },
  'mod+1': {
    label: 'Перейти в Inbox',
    action: (e) => {
      e.preventDefault()
      useStore.getState().setView('inbox')
    },
  },
  'mod+2': {
    label: 'Перейти в Focus',
    action: (e) => {
      e.preventDefault()
      useStore.getState().setView('focus')
    },
  },
  'mod+3': {
    label: 'Перейти в Vault',
    action: (e) => {
      e.preventDefault()
      useStore.getState().setView('vault')
    },
  },
  'mod+4': {
    label: 'Перейти в AgentLab',
    action: (e) => {
      e.preventDefault()
      useStore.getState().setView('agents')
    },
  },
  'mod+5': {
    label: 'Перейти в Project Home Page',
    action: (e) => {
      e.preventDefault()
      useStore.getState().setView('project')
    },
  },
  'mod+6': {
    label: 'Перейти в Strategic Hub',
    action: (e) => {
      e.preventDefault()
      useStore.getState().setView('hub')
    },
  },
  'mod+c': {
    label: 'Быстрое создание (Активный проект)',
    action: (e) => {
      // 1. ПРОВЕРКА НА КОПИРОВАНИЕ
      const selection = window.getSelection()?.toString()
      if (selection && selection.length > 0) {
        return // Не блокируем, пусть копирует
      }

      e.preventDefault() // Блокируем, открываем модалку

      const { activeScope } = useScopeStore.getState()
      const { openCapture } = useQuickCaptureStore.getState()

      // Если есть активный проект - используем его, иначе General
      if (activeScope) {
        openCapture(activeScope.id, activeScope.name)
      } else {
        openCapture(null, 'General')
      }
    },
  },

  'mod+shift+c': {
    label: 'Быстрое создание (Общее)',
    action: (e) => {
      e.preventDefault()
      const { openCapture } = useQuickCaptureStore.getState()
      openCapture(null, 'General')
    },
  },
  'mod+e': {
    label: 'Редактировать элемент',
    action: (e) => {
      e.preventDefault()
      const store = useStore.getState()
      // 1. Если открыта модалка фокуса — редактируем её айтем
      if (store.focusItem) {
        store.setEditingItem(store.focusItem)
        return
      }
      // 2. Если мы в Omni (standalone) или просто на странице —
      // ищем элемент, на котором сейчас фокус (через наш data-attribute)
      const selectedEl = document.querySelector(
        '[data-item-id][aria-selected="true"]'
      ) as HTMLElement
      if (selectedEl?.dataset.itemId) {
        const item = store.items.find((i) => i.id === selectedEl.dataset.itemId)
        if (item) store.setEditingItem(item)
      }
    },
  },
}

// Хелпер для хука
export const getHotkeys = (): [string, (e: KeyboardEvent) => void][] => {
  return Object.entries(HOTKEY_MAP).map(([key, { action }]) => [key, action])
}
