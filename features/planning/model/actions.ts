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

  // 1. ПОЛУЧАЕМ КОНТЕКСТ
  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('manifesto')
    .eq('id', user.id)
    .single()

  const { data: availableTasks } = await supabase
    .from('items')
    .select('id, content, description, priority, ai_tags, type')
    .in('status', ['planned']) // Только из Плана
    .limit(200)

  if (!availableTasks || availableTasks.length === 0) {
    return { error: 'Нет запланированных задач для составления плана.' }
  }

  // 2. ФОРМИРУЕМ ЧИТАЕМЫЙ ПРОМПТ (КАК В ASK_BRAIN)
  const manifestoStr = `МАНИФЕСТ (Цели и Роли):\n${JSON.stringify(
    profile?.manifesto || {},
    null,
    2
  )}`

  const tasksStr =
    'СПИСОК ДОСТУПНЫХ ЗАДАЧ (БЭКЛОГ):\n' +
    availableTasks
      .map((item) => {
        return `
          ---
          ID: ${item.id}
          ЗАДАЧА: "${item.content}"
          ПРИОРИТЕТ: ${item.priority || 'medium'}
          ТЕГИ: [${(item.ai_tags || []).join(', ')}]
          ---`
      })
      .join('\n')

  const systemPrompt = `
    ТЫ — АССИСТЕНТ-СТРАТЕГ. Твоя задача — проанализировать Манифест и Бэклог пользователя, а затем составить СБАЛАНСИРОВАННЫЙ план на день.
    
    МАНИФЕСТ ПОЛЬЗОВАТЕЛЯ:
    ${manifestoStr}
    
    ДОСТУПНЫЕ ЗАДАЧИ (БЭКЛОГ):
    ${tasksStr}
    
    ПРАВИЛА:
    1. Проанализируй Манифест и Бэклог.
    2. Выбери 3-5 самых важных ID задач. Учитывай роли и приоритеты.
    3. Объясни свой выбор в поле 'reasoning'.
    4. Верни ТОЛЬКО JSON в формате: { "reasoning": "...", "task_ids": ["..."] }
  `

  // ... (дебаг-логи, которые ты просил)
  console.log(
    '==================== AI PLANNER PROMPT START ===================='
  )
  console.log(systemPrompt)
  console.log(
    '==================== AI PLANNER PROMPT END ======================'
  )

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Составь для меня план на сегодня.' },
      ],
      model: 'meta-llama/llama-3-70b-instruct',
      response_format: { type: 'json_object' },
      temperature: 0.6,
    })

    const content = completion.choices[0].message.content || '{}'
    console.log('🤖 AI Planner Raw Response:', content)

    const result = JSON.parse(content)
    const taskIds = result.task_ids
    const reasoning = result.reasoning

    if (!taskIds || taskIds.length === 0) {
      return {
        error: `ИИ не выбрал задачи. Его объяснение: ${
          reasoning || 'нет объяснения'
        }`,
      }
    }

    // ОБНОВЛЕНИЕ СТАТУСА В БАЗЕ
    const { error } = await supabase
      .from('items')
      .update({ status: 'today', planned_at: new Date().toISOString() })
      .in('id', taskIds)

    if (error) throw error

    revalidatePath('/')
    return { success: true, planned: taskIds.length, reasoning: reasoning }
  } catch (e: any) {
    console.error('Daily plan generation failed:', e)
    return { error: e.message }
  }
}

/**
 * Сбрасывает все задачи "Сегодня" обратно в "План".
 * Очищает planned_at, чтобы убрать их из "гниения".
 */
export async function resetTodayView() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'planned',
        planned_at: null, // <-- Сбрасываем дату
      })
      .eq('user_id', user.id)
      .eq('status', 'today') // Только те, что в фокусе

    if (error) throw error

    revalidatePath('/') // Обновляем UI
    return { success: true }
  } catch (e: any) {
    console.error('Reset today failed:', e)
    return { error: e.message }
  }
}
