import { create } from 'zustand'
import type { SubscriptionTier, FeatureKey } from '../config'

interface PaywallState {
  // Данные юзера
  tier: SubscriptionTier
  setTier: (tier: SubscriptionTier) => void

  // UI Модалки
  isOpen: boolean
  triggeredBy: FeatureKey | null // Какая фича вызвала пэйволл? (Чтобы показать нужный текст)

  openPaywall: (trigger: FeatureKey) => void
  closePaywall: () => void
}

export const usePaywallStore = create<PaywallState>((set) => ({
  tier: 'free', // По дефолту FREE, пока не загрузим профиль
  setTier: (tier) => set({ tier }),

  isOpen: false,
  triggeredBy: null,

  openPaywall: (trigger) => set({ isOpen: true, triggeredBy: trigger }),
  closePaywall: () => set({ isOpen: false, triggeredBy: null }),
}))
