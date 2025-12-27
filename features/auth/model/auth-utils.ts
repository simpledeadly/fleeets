import { SupabaseClient } from '@supabase/supabase-js'
import { fetchActiveItems } from '@/lib/data'

export async function finalizeLogin(
  supabase: SupabaseClient,
  setItems: (items: any[]) => void,
  router: any,
  session: { access_token: string; refresh_token: string }
) {
  const { error } = await supabase.auth.setSession(session)

  if (!error) {
    try {
      const items = await fetchActiveItems(supabase)
      setItems(items)
    } catch (e) {
      console.error('Prefetch error', e)
    }
    router.refresh()
    router.push('/')
  }
}
