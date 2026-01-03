import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CommandCenterState {
  // Для "Pending" индикатора
  count: number
  increment: () => void
  decrement: () => void
  isPaletteOpen: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
  layout: number[]
  setLayout: (sizes: number[]) => void
  visibleLimit: number
  setVisibleLimit: (limit: number) => void
}

export const useOmniStore = create<CommandCenterState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
      isPaletteOpen: false,
      openPalette: () => set({ isPaletteOpen: true }),
      closePalette: () => set({ isPaletteOpen: false }),
      togglePalette: () =>
        set((state) => ({ isPaletteOpen: !state.isPaletteOpen })),
      layout: [60, 30],
      setLayout: (sizes) => set({ layout: sizes }),
      visibleLimit: 50,
      setVisibleLimit: (limit) => set({ visibleLimit: limit }),
    }),
    {
      name: 'omni-storage', // Имя ключа в localStorage
      partialize: (state) => ({
        layout: state.layout,
        visibleLimit: state.visibleLimit,
      }), // Сохраняем и layout, и лимит
    }
  )
)
