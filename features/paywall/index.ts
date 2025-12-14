// Экспортируем только то, что нужно внешнему миру
export { usePaywall } from './model/usePaywall'
export { usePaywallStore } from './model/store' // Иногда нужен прямой доступ к стору (редко)
export type { SubscriptionTier } from './config'

// В будущем здесь будет экспорт компонента модалки:
// export { PaywallModal } from './ui/PaywallModal'
