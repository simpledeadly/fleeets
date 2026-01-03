import { useStore } from '@/lib/store'
import { createItem } from '@/features/item'
import { useOmniStore } from '@/features/omni'

type HotkeyAction = () => void

export const HOTKEY_MAP: Record<
  string,
  { label: string; action: HotkeyAction }
> = {
  'mod+k': {
    label: 'Открыть Omni',
    action: () => {
      const { isPaletteOpen, closePalette, openPalette } =
        useOmniStore.getState()
      if (isPaletteOpen) closePalette()
      else openPalette()
    },
  },
  'mod+j': {
    label: 'Фокус на Capture Bar',
    action: () => {
      const input = document.getElementById(
        'capture-bar-input'
      ) as HTMLInputElement
      input?.focus()
    },
  },
  'mod+i': {
    label: 'Перейти в Inbox',
    action: () => useStore.getState().setView('inbox'),
  },
  'mod+f': {
    label: 'Перейти в Focus',
    action: () => useStore.getState().setView('focus'),
  },
  'mod+g': {
    label: 'Перейти в Vault',
    action: () => useStore.getState().setView('vault'),
  },
  'mod+e': {
    label: 'Редактировать элемент',
    action: () => {
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
