import { create } from 'zustand'

interface CommandCenterState {
  // Для "Pending" индикатора
  count: number
  increment: () => void
  decrement: () => void

  isPaletteOpen: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

export const useOmniStore = create<CommandCenterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),

  isPaletteOpen: false,
  openPalette: () => set({ isPaletteOpen: true }),
  closePalette: () => set({ isPaletteOpen: false }),
  togglePalette: () =>
    set((state) => ({ isPaletteOpen: !state.isPaletteOpen })),
}))
