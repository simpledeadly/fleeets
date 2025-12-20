import { usePaywallStore } from './store'
import { PAYWALL_CONFIG, type FeatureKey, type FeatureConfig } from '../config'

export function usePaywall() {
  const { tier, openPaywall } = usePaywallStore()
  const isPro = tier === 'pro'

  /**
   * Проверка доступа к функции.
   * Если доступа нет - АВТОМАТИЧЕСКИ открывает модалку.
   * @returns true, если доступ разрешен
   */
  const check = (feature: FeatureKey): boolean => {
    if (isPro) return true // PRO может всё

    // Приводим к общему интерфейсу FeatureConfig, чтобы TS не ругался на отсутствие полей
    const config = PAYWALL_CONFIG[feature] as FeatureConfig

    // Если фича требует PRO или PREMIUM, а у нас Free
    if (config.tier === 'pro') {
      openPaywall(feature)
      return false
    }

    return true
  }

  /**
   * Проверка числового лимита.
   * @param feature - ключ фичи (например, 'active_items')
   * @param currentCount - текущее количество у юзера
   */
  const checkLimit = (feature: FeatureKey, currentCount: number): boolean => {
    if (isPro) return true // У PRO безлимит

    // Приводим к общему интерфейсу FeatureConfig
    const config = PAYWALL_CONFIG[feature] as FeatureConfig

    // Теперь доступ к .limit безопасен (он number | undefined)
    if (config.limit !== undefined && currentCount >= config.limit) {
      openPaywall(feature)
      return false
    }

    return true
  }

  return {
    isPro, // Просто факт для отрисовки UI (замочки, бэйджики)
    check, // Основной гард (с открытием модалки)
    checkLimit, // Гард лимитов (с открытием модалки)
    openPaywall, // Ручное открытие (для кнопки "Купить PRO")
  }
}
