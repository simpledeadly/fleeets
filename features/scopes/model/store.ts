import { create } from 'zustand'

export interface Scope {
  id: string
  name: string
  slug: string
  view_type: string
  manifesto: string
  description?: string
  theme_config: any
  view_config?: any
  active_blueprint_id?: string | null
  created_at?: string
  updated_at?: string
  user_id: string
}

interface ScopeState {
  scopes: Scope[]
  activeScope: Scope | null
  isLoading: boolean
  isSwitching: boolean
  isScopeDialogOpen: boolean
  editingScope: Scope | null
  setIsScopeDialogOpen: (val: boolean) => void
  setEditingScope: (scope: Scope | null) => void
  setIsSwitching: (val: boolean) => void
  setScopes: (scopes: Scope[]) => void
  setActiveScope: (scope: Scope | null) => void
  setIsLoading: (loading: boolean) => void
  addScope: (scope: Scope) => void
  updateScopeInStore: (id: string, updates: any) => void
  removeScopeFromStore: (id: string) => void
}

export const useScopeStore = create<ScopeState>((set) => ({
  scopes: [],
  activeScope: null,
  isLoading: true,
  isSwitching: false,
  isScopeDialogOpen: false,
  editingScope: null,
  setIsScopeDialogOpen: (val) => set({ isScopeDialogOpen: val }),
  setEditingScope: (scope) => set({ editingScope: scope }),
  setIsSwitching: (val) => set({ isSwitching: val }),
  setScopes: (scopes) => set({ scopes }),
  setActiveScope: (scope) => set({ activeScope: scope }),
  setIsLoading: (isLoading) => set({ isLoading }),
  addScope: (scope) => set((state) => ({ scopes: [...state.scopes, scope] })),
  updateScopeInStore: (id, updates) =>
    set((state) => ({
      scopes: state.scopes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
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
