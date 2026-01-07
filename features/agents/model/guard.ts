// features/agents/model/guard.ts
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Проверяет, не превышен ли дневной лимит трат пользователя на ИИ.
 * @param dailyLimit Лимит в долларах (по умолчанию $0.50)
 */
export async function validateDailyBudget(
  supabase: SupabaseClient,
  userId: string,
  dailyLimit = 0.5
): Promise<void> {
  // Вызываем SQL функцию, которую мы создали ранее
  const { data: currentUsage, error } = await supabase.rpc('get_daily_usage', {
    uid: userId,
  })

  if (error) {
    console.error('[GUARD_API_ERROR]: Не удалось проверить бюджет:', error)
    // Fail-safe: если база упала, лучше разрешить запрос, чтобы не ломать UX,
    // но залогировать ошибку.
    return
  }

  if (currentUsage !== null && currentUsage >= dailyLimit) {
    throw new Error('BUDGET_EXCEEDED')
  }
}
