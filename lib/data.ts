import type { SupabaseClient } from '@supabase/supabase-js'
import type { Item } from '@/lib/store'
import type { SubscriptionTier } from '@/features/paywall'

export async function fetchActiveItems(supabase: SupabaseClient) {
  console.log('🚀 [API] Fetching items...')

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .in('status', ['inbox', 'planned', 'archived', 'today', 'done'])
    // Можно добавить сортировку, чтобы порядок был стабильным
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ [API] Error fetching items:', error)
    throw error
  }

  return (data as Item[]) || []
}

export async function fetchUserTier(
  supabase: SupabaseClient
): Promise<SubscriptionTier> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 'free'

    // Проверяем таблицу subscriptions
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle() // Возвращает null, если записей нет (вместо ошибки)

    if (error) {
      console.error('⚠️ Error fetching subscription:', error)
      return 'free'
    }

    if (data) {
      console.log('💎 User is PRO')
      return 'pro'
    }

    console.log("👤 User is FREE")
    return 'free'
  } catch (e) {
    console.error("Critical error in fetchUserTier", e)
    return 'free'
  }
}
