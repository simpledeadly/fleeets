import { usePaywallStore } from './store'
import { activateMockSubscription, cancelMockSubscription } from './actions'

// Интерфейс ответа (что возвращает платежка)
interface CheckoutResult {
  success: boolean
  error?: string
}

const IS_DEV = process.env.NODE_ENV === 'development'

// 1. РЕАЛЬНАЯ ЛОГИКА (Stripe / Prodamus)
async function realCheckout(priceId: string): Promise<CheckoutResult> {
  console.log('💳 Initializing Real Checkout for', priceId)

  // TODO: Здесь будет fetch('/api/checkout', ...)
  // const res = await fetch(...)
  // window.location.href = res.url

  return { success: false, error: 'Payment provider not connected yet' }
}

// 2. ИМИТАЦИЯ (Mock)
async function mockCheckout(priceId: string): Promise<CheckoutResult> {
  console.log('🧪 [MOCK] Checkout started for:', priceId)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 1. Вызываем Server Action (Пишем в БД)
  const result = await activateMockSubscription()

  if (result.success) {
    // 2. Обновляем клиентский стор
    usePaywallStore.getState().setTier('pro')
    return { success: true }
  }

  return { success: false, error: result.error || 'DB update failed' }
}

// Добавим метод отмены в сервис
async function mockCancel(): Promise<CheckoutResult> {
  console.log('🧪 [MOCK] Canceling...')
  await new Promise((resolve) => setTimeout(resolve, 500))

  const result = await cancelMockSubscription()

  if (result.success) {
    usePaywallStore.getState().setTier('free')
    return { success: true }
  }
  return { success: false, error: result.error }
}

// 3. ЕДИНАЯ ТОЧКА ВХОДА
export const paymentService = {
  /**
   * Запуск процесса оплаты
   * @param priceId - ID тарифа (пока не используется, но на будущее)
   */
  checkout: async (priceId: string = 'default'): Promise<CheckoutResult> => {
    // 🔥 ВОТ ОНА - ОДНА СТРОЧКА ПЕРЕКЛЮЧЕНИЯ
    // Хочешь тестировать реальную оплату в деве? Поставь if (false)
    if (IS_DEV) {
      return await mockCheckout(priceId)
    } else {
      return await realCheckout(priceId)
    }
  },

  cancelSubscription: async () => {
    if (IS_DEV) return await mockCancel()
    // return await realCancel()
    return { success: false, error: 'Not implemented' }
  },
}
