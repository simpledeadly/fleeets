import { usePaywallStore } from './store'

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

  // Имитируем задержку сети (1.5 сек)
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Имитируем успех (можно добавить random для теста ошибок)
  const isSuccess = true

  if (isSuccess) {
    // ВАЖНО: В режиме теста мы сразу обновляем стор на клиенте,
    // чтобы ты увидел результат без реального вебхука от банка.
    usePaywallStore.getState().setTier('pro')
    return { success: true }
  }

  return { success: false, error: 'Mock payment failed (random)' }
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
}
