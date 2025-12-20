'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

type EventType =
  | 'item.create'
  | 'item.update'
  | 'item.status_change'
  | 'item.delete'
  | 'item.triage'
  | 'item.log_update'
  | 'item.decompose'
  | 'focus.session'

interface LogEventParams {
  userId: string
  itemId?: string
  eventType: EventType
  meta?: Record<string, any> // Любые доп данные
  startedAt?: string
  endedAt?: string
}

export async function logEvent({
  userId,
  itemId,
  eventType,
  meta = {},
  startedAt,
  endedAt,
}: LogEventParams) {
  try {
    const supabase = await createAdminClient()

    // Пытаемся определить устройство (Mobile/Desktop)
    const userAgent = (await headers()).get('user-agent') || ''
    const device = /mobile/i.test(userAgent) ? 'mobile' : 'desktop'

    const now = new Date().toISOString()

    supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        source: 'web_app',
        category: eventType, // Пишем тип события в категорию для простоты фильтрации
        started_at: startedAt || now,
        ended_at: endedAt || now,
        details: {
          item_id: itemId,
          device: device,
          ...meta,
        },
      })
      .then(({ error }) => {
        if (error) console.error('Background Log Error:', error.message)
      })
  } catch (err) {
    console.error('Critical Logging Fail:', err)
  }
}
