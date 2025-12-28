'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function sendPhotoToTelegram(
  base64Image: string,
  caption: string
) {
  console.log('📤 [TG Share] Запрос получен. Длина строки:', base64Image.length)

  try {
    // 1. Используем ОБЫЧНЫЙ клиент для получения сессии пользователя из кук
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('❌ [TG Share] Ошибка: Пользователь не найден в сессии')
      return { error: 'Вы не авторизованы. Перезайдите в приложение.' }
    }

    // 2. Используем АДМИНСКИЙ клиент, чтобы достать telegram_id (если RLS закрыт)
    const supabaseAdmin = createAdminClient()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('telegram_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.telegram_id) {
      return { error: 'Ваш Telegram не привязан. Войдите через бота ещё раз.' }
    }

    // 3. Конвертация картинки
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const formData = new FormData()
    formData.append('chat_id', profile.telegram_id.toString())

    const blob = new Blob([buffer], { type: 'image/png' })
    formData.append('photo', blob, 'report.png')
    formData.append('caption', caption)

    const token = process.env.TELEGRAM_BOT_TOKEN

    // Стандарт: https://api.telegram.org
    // Прокси: https://api.telegram-proxy.org
    const TELEGRAM_API_BASE = 'https://api.telegram.org'

    console.log(
      `🚀 [TG Share] Отправка пользователю ${profile.telegram_id}...`
    )

    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendPhoto`, {
      method: 'POST',
      body: formData,
      // Добавляем таймаут, чтобы не висеть вечно
      signal: AbortSignal.timeout(15000),
    })

    const tgResult = await res.json()

    if (!res.ok) {
      console.error('❌ [TG Share] Telegram API Error:', tgResult)
      return { error: tgResult.description || 'Бот не смог отправить фото' }
    }

    console.log('✅ [TG Share] Успешно отправлено в Telegram!')
    return { success: true }
  } catch (err: any) {
    console.error('🔥 [TG Share] Critical Error:', err)
    return { error: 'Критическая ошибка: ' + err.message }
  }
}
