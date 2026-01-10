import { create } from 'zustand'

export interface Scope {
  id: string
  name: string
  slug: string
  view_type: string
  manifesto: string
  theme_config: any
}

interface ScopeState {
  scopes: Scope[]
  activeScope: Scope | null
  isLoading: boolean

  setScopes: (scopes: Scope[]) => void
  setActiveScope: (scope: Scope) => void
  setIsLoading: (loading: boolean) => void
  addScope: (scopes: Scope) => void
  updateScopeInStore: (id: string, updates: any) => void
  removeScopeFromStore: (id: string) => void
}

export const useScopeStore = create<ScopeState>((set) => ({
  scopes: [],
  activeScope: null,
  isLoading: true,

  setScopes: (scopes) => set({ scopes }),
  setActiveScope: (scope) => set({ activeScope: scope }),
  setIsLoading: (isLoading) => set({ isLoading }),
  addScope: (scope) => set((state) => ({ scopes: [...state.scopes, scope] })),
  updateScopeInStore: (id, updates) =>
    set((state) => ({
      scopes: state.scopes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      // Если обновили активный - обновляем и его
      activeScope:
        state.activeScope?.id === id
          ? { ...state.activeScope, ...updates }
          : state.activeScope,
    })),
  removeScopeFromStore: (id) =>
    set((state) => ({
      scopes: state.scopes.filter((s) => s.id !== id),
      activeScope:
        state.activeScope?.id === id
          ? state.scopes.find((s) => s.id !== id) || null
          : state.activeScope,
    })),
}))
