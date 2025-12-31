'use server'

import { createAdminClient } from '../lib/supabase/admin'
import { createClient } from '../lib/supabase/server'
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
  userId?: string // Сделали опциональным
  itemId?: string
  eventType: EventType
  meta?: Record<string, any>
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
    let finalUserId = userId

    // Если userId не передан, пробуем достать из сессии
    if (!finalUserId) {
      const supabaseUser = await createClient()
      const {
        data: { user },
      } = await supabaseUser.auth.getUser()
      finalUserId = user?.id
    }

    if (!finalUserId) {
      console.warn('Logging skipped: No userId found')
      return
    }

    const supabase = await createAdminClient()

    // Пытаемся определить устройство (Mobile/Desktop)
    const userAgent = (await headers()).get('user-agent') || ''
    const device = /mobile/i.test(userAgent) ? 'mobile' : 'desktop'

    const now = new Date().toISOString()

    // Не ждем выполнения, пишем в «фоне»
    supabase
      .from('activity_logs')
      .insert({
        user_id: finalUserId,
        source: 'web_app',
        category: eventType,
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
