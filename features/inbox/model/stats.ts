'use server'
import { createClient } from '@/lib/supabase/server'

export async function getInboxStats() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { today: 0, total: 0 }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const startOfDayISO = startOfDay.toISOString()

  // 1. Статистика за сегодня (считаем логи)
  const { count: todayCount } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('category', ['item.triage', 'inbox_triage'])
    .gte('created_at', startOfDayISO)

  // 2. Статистика за все время (Можно считать логи, а можно считать обработанные задачи)
  // Вариант А: Считать логи (точно показывает процесс работы)
  const { count: totalCount } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('category', ['item.triage', 'inbox_triage'])

  // Вариант Б: Считать текущее состояние базы (сколько сейчас НЕ в инбоксе)
  // Это покажет "Объем базы знаний", а не "Твою продуктивность".
  // Я рекомендую Вариант А.

  return {
    today: todayCount || 0,
    total: totalCount || 0,
  }
}
