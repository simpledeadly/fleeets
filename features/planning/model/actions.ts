'use server'

import OpenAI from 'openai'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function generateDailyPlan(theme?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  let availableTasks: any[] = []

  // --- ПОЛУЧЕНИЕ КОНТЕКСТА ---
  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('manifesto')
    .eq('id', user.id)
    .single()

  // --- ЛОГИКА ВЫБОРКИ ЗАДАЧ ---

  if (theme && theme.trim().length > 1) {
    // РЕЖИМ 1: Тематический план (RAG)
    console.log(`🧠 Планируем по теме: "${theme}"`)

    // 1. Генерируем вектор для темы
    const embeddingResponse = await openai.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: theme,
    })
    const embedding = embeddingResponse.data[0].embedding

    // 2. Ищем похожие, НО ТОЛЬКО СРЕДИ 'planned'
    const { data } = await supabase.rpc('match_items', {
      query_embedding: embedding,
      match_threshold: 0.3, // Более мягкий порог для широкого поиска
      match_count: 50, // Берем с запасом
      user_id_input: user.id,
    })

    // 3. Фильтруем на сервере, чтобы убедиться, что там только 'planned'
    availableTasks = (data || []).filter(
      (item: any) => item.status === 'planned'
    )
  } else {
    // РЕЖИМ 2: Общий план
    console.log('🧠 Планируем по всему бэклогу')
    const { data } = await supabase
      .from('items')
      .select('id, content, description, priority, ai_tags, type')
      .in('status', ['planned'])
      .order('created_at', { ascending: false })
      .limit(100)
    availableTasks = data || []
  }

  if (availableTasks.length === 0) {
    return { error: 'Не найдено подходящих задач для плана.' }
  }

  // --- ФОРМИРОВАНИЕ ПРОМПТА И ВЫЗОВ AI ---
  const manifestoStr = `МАНИФЕСТ:\n${JSON.stringify(
    profile?.manifesto || {},
    null,
    2
  )}`

  const tasksStr =
    'ДОСТУПНЫЕ ЗАДАЧИ:\n' +
    availableTasks
      .map(
        (item) =>
          `ID: ${item.id}, ЗАДАЧА: "${item.content}", ${
            item.description ? 'ОПИСАНИЕ: ' + item.description : ''
          }, ${
            item.raw_content ? 'ИСХОДНЫЙ ТЕКСТ: ' + item.raw_content : ''
          }, ПРИОРИТЕТ: ${item.priority || 'medium'}`
      )
      .join('\n')

  const systemPrompt = `
      ТЫ — АССИСТЕНТ-СТРАТЕГ. Составь СБАЛАНСИРОВАННЫЙ план на день (3-5 задач).
      ${manifestoStr}
      ${tasksStr}
      АЛГОРИТМ:
      1.  "Лягушка": Найди ОДНУ самую сложную/важную задачу, двигающую к цели.
      2.  "Быстрые Победы": Найди 1-2 маленькие задачи для дофамина.
      3.  "Баланс": Убедись, что задачи покрывают разные роли.
      
      Верни ТОЛЬКО JSON: { "reasoning": "...", "task_ids": ["..."] }
    `

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Составь для меня план на сегодня.' },
      ],
      model: 'meta-llama/llama-3.3-70b-instruct',
      response_format: { type: 'json_object' },
      temperature: 0.6,
    })

    const content = completion.choices[0].message.content || '{}'
    console.log('🤖 AI Planner Raw Response:', content)

    let result = { task_ids: [], reasoning: '' }
    try {
      const firstBrace = content.indexOf('{')
      const lastBrace = content.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = content.substring(firstBrace, lastBrace + 1)
        result = JSON.parse(jsonString)
      } else {
        throw new Error('No JSON object found in AI response')
      }
    } catch (e) {
      console.error('Failed to parse AI JSON, returning error.', e)
      return {
        error: `AI вернул некорректный формат: ${content.substring(0, 100)}...`,
      }
    }

    const taskIds = result.task_ids
    const reasoning = result.reasoning

    if (!taskIds || taskIds.length === 0) {
      return {
        error: `ИИ не выбрал задачи. Его объяснение: ${
          reasoning || 'нет объяснения'
        }`,
      }
    }

    // ОБНОВЛЕНИЕ СТАТУСА
    const { error } = await supabase
      .from('items')
      .update({ status: 'today', planned_at: new Date().toISOString() })
      .in('id', taskIds)

    if (error) throw error

    revalidatePath('/')
    return {
      success: true,
      planned: taskIds.length,
      reasoning: result.reasoning,
    }
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
