import { create } from 'zustand'

interface QuickCaptureState {
  isOpen: boolean
  targetScopeId: string | null // null = General
  targetScopeName: string

  openCapture: (scopeId: string | null, scopeName: string) => void
  closeCapture: () => void
}

export const useQuickCaptureStore = create<QuickCaptureState>((set) => ({
  isOpen: false,
  targetScopeId: null,
  targetScopeName: 'General',

  openCapture: (scopeId, scopeName) =>
    set({ isOpen: true, targetScopeId: scopeId, targetScopeName: scopeName }),

  closeCapture: () => set({ isOpen: false }),
}))
