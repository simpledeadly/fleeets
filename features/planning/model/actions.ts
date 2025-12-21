'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function generateDailyPlan() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. ПОЛУЧАЕМ КОНТЕКСТ: Манифест и Задачи
  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('manifesto')
    .eq('id', user.id)
    .single()

  const { data: availableTasks } = await supabase
    .from('items')
    .select('id, content, description, priority, ai_tags')
    .in('status', ['inbox', 'planned']) // Берем из Инбокса и Плана
    .limit(100) // Ограничиваем, чтобы не сломать контекст

  if (!availableTasks || availableTasks.length === 0) {
    console.log('No tasks available to plan.')
    return { success: true }
  }

  // 2. ФОРМИРУЕМ ПРОМПТ
  const manifestoStr = JSON.stringify(profile?.manifesto || {})
  const tasksStr = JSON.stringify(availableTasks)

  const systemPrompt = `
    ТЫ — ЛИЧНЫЙ АССИСТЕНТ.
    Твоя задача — проанализировать Манифест пользователя (его цели и роли) и его список доступных задач,
    а затем выбрать 3-5 САМЫХ ВАЖНЫХ задач на сегодня.

    МАНИФЕСТ ПОЛЬЗОВАТЕЛЯ:
    ${manifestoStr}

    СПИСОК ДОСТУПНЫХ ЗАДАЧ (JSON):
    ${tasksStr}

    ПРАВИЛА:
    1. Выбирай задачи, которые максимально приближают пользователя к его целям из Манифеста.
    2. Учитывай приоритет (priority: 'high') и теги.
    3. Не бери слишком много, чтобы план был реалистичным (3-5 задач).
    4. Верни ТОЛЬКО JSON-массив с ID выбранных задач.
    
    Пример ответа:
    {
      "task_ids": ["uuid-1", "uuid-2", "uuid-3"]
    }
  `

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'meta-llama/llama-3-70b-instruct',
      response_format: { type: 'json_object' },
      temperature: 0.3, // Низкая температура для точности
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    const taskIds = result.task_ids

    if (!taskIds || taskIds.length === 0) {
      console.log("AI didn't select any tasks.")
      return { success: true }
    }

    // 3. ОБНОВЛЯЕМ СТАТУС В БАЗЕ
    const { error } = await supabase
      .from('items')
      .update({ status: 'today', planned_at: new Date().toISOString() })
      .in('id', taskIds)

    if (error) throw error

    revalidatePath('/') // Обновляем UI
    return { success: true, planned: taskIds.length }
  } catch (e: any) {
    console.error('Daily plan generation failed:', e)
    return { error: e.message }
  }
}
