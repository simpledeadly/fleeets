import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Database } from '@/types/supabase'
import type { ViewType } from '@/features/views'

export type Item = Database['public']['Tables']['items']['Row']

interface InboxStats {
  today: number
  total: number
  lastUpdated: number
}

interface AppState {
  items: Item[]
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  updateItem: (item: Item) => void
  replaceItem: (tempId: string, realItem: Item) => void
  removeItem: (itemId: string) => void
  isLoading: boolean
  isInitialized: boolean
  currentView: ViewType
  setView: (view: ViewType) => void
  focusItem: Item | null // Для модалки фокуса
  setFocusItem: (item: Item | null) => void
  editingItem: Item | null // Для сайдбара-редактора
  setEditingItem: (item: Item | null) => void
  inboxStats: InboxStats
  setInboxStats: (stats: Omit<InboxStats, 'lastUpdated'>) => void
  incrementInboxStats: () => void // Чтобы увеличивать на +1 при свайпе
  isSnowing: boolean
  toggleSnow: () => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (state: boolean) => void
  reorderItems: (newOrder: Item[]) => void
  promoteToHero: (id: string) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      items: [],
      isLoading: true,
      isInitialized: false,
      currentView: 'inbox',
      setView: (view) => set({ currentView: view }),
      setItems: (items) =>
        set({ items, isLoading: false, isInitialized: true }),
      addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
      updateItem: (updatedItem) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === updatedItem.id ? { ...item, ...updatedItem } : item
          ),
        })),
      replaceItem: (tempId, realItem) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === tempId ? realItem : item
          ),
        })),
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),
      focusItem: null,
      setFocusItem: (item) => set({ focusItem: item }),
      editingItem: null,
      setEditingItem: (item) => set({ editingItem: item }),
      inboxStats: { today: 0, total: 0, lastUpdated: 0 },
      setInboxStats: (stats) =>
        set({
          inboxStats: { ...stats, lastUpdated: Date.now() },
        }),
      incrementInboxStats: () =>
        set((state) => ({
          inboxStats: {
            ...state.inboxStats, // Копируем все, включая lastUpdated
            today: state.inboxStats.today + 1,
            total: state.inboxStats.total + 1,
          },
        })),
      isSnowing: false, // По дефолту выкл (или вкл, если хочешь праздника сразу)
      toggleSnow: () => set((state) => ({ isSnowing: !state.isSnowing })),
      isSettingsOpen: false,
      setIsSettingsOpen: (state) => set({ isSettingsOpen: state }),
      reorderItems: (newOrder) => set({ items: newOrder }),
      promoteToHero: (id) =>
        set((state) => {
          const itemIndex = state.items.findIndex((i) => i.id === id)
          if (itemIndex === -1) return state

          const newItems = [...state.items]
          const [item] = newItems.splice(itemIndex, 1)
          return { items: [item, ...newItems] }
        }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ isSnowing: state.isSnowing }),
    }
  )
)
