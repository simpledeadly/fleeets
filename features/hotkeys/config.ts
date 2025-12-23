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
    action: () => useOmniStore.getState().togglePalette(),
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
  'mod+v': {
    label: 'Создать новое входящее',
    action: async () => await createItem(''),
  },
}

// Хелпер для хука
export const getHotkeys = (): [string, (e: KeyboardEvent) => void][] => {
  return Object.entries(HOTKEY_MAP).map(([key, { action }]) => [key, action])
}
