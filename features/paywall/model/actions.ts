'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function activateMockSubscription() {
  const supabase = await createClient()
  // 1. Получаем ID юзера честно (кто стучится?)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // 2. А вот запись делаем от имени АДМИНА (обход RLS)
  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin.from('subscriptions').upsert({
    id: `sub_mock_${Date.now()}`,
    user_id: user.id,
    status: 'active',
    price_id: 'price_pro_monthly',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    cancel_at_period_end: false,
  })

  if (error) {
    console.error('Admin DB Error:', error)
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function cancelMockSubscription() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  return { success: true }
}
