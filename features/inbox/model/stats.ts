'use server'
import { createClient } from '../../../lib/supabase/server'

export async function getInboxStats() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      inputCount: 0,
      outputCount: 0,
      completedCount: 0,
      focusMins: 0,
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  try {
    const { data: report, error } = await supabase.rpc('get_daily_report', {
      user_uuid: user.id,
      target_date: todayStr,
    })

    if (error) throw error

    return {
      inputCount: report?.input_count || 0,
      outputCount: report?.output_count || 0,
      completedCount: report?.completed?.length || 0,
      focusMins: report?.focus_stats?.total_mins || 0,
    }
  } catch (e) {
    console.error('Failed to fetch inbox stats:', e)
    return {
      inputCount: 0,
      outputCount: 0,
      completedCount: 0,
      focusMins: 0,
    }
  }
}
