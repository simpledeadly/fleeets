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
}

export const useScopeStore = create<ScopeState>((set) => ({
  scopes: [],
  activeScope: null,
  isLoading: true,

  setScopes: (scopes) => set({ scopes }),
  setActiveScope: (scope) => set({ activeScope: scope }),
  setIsLoading: (isLoading) => set({ isLoading }),
}))
