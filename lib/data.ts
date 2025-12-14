import { type SupabaseClient } from '@supabase/supabase-js'
import { type Item } from '@/lib/store'

export async function fetchActiveItems(supabase: SupabaseClient) {
  console.log('🚀 [API] Fetching items...')

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .in('status', ['inbox', 'planned', 'archived', 'today'])
    // Можно добавить сортировку, чтобы порядок был стабильным
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ [API] Error fetching items:', error)
    throw error
  }

  return (data as Item[]) || []
}
