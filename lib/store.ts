import { create } from 'zustand'
import { type Database } from '@/types/supabase'

export type Item = Database['public']['Tables']['items']['Row']
export type View = 'inbox' | 'plan' | 'archive' | 'focus'

interface AppState {
  items: Item[]
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  updateItem: (item: Item) => void
  replaceItem: (tempId: string, realItem: Item) => void
  removeItem: (itemId: string) => void
  isLoading: boolean
  isInitialized: boolean
  currentView: View
  setView: (view: View) => void
}

export const useStore = create<AppState>((set) => ({
  items: [],
  isLoading: true,
  isInitialized: false,
  currentView: 'inbox',
  setView: (view) => set({ currentView: view }),
  setItems: (items) => set({ items, isLoading: false, isInitialized: true }),
  addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
  updateItem: (updatedItem) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === updatedItem.id ? { ...item, ...updatedItem } : item
      ),
    })),
  replaceItem: (tempId, realItem) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === tempId ? realItem : item)),
    })),
  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    })),
}))
