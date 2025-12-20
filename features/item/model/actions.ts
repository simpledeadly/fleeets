'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/supabase'
import OpenAI from 'openai'
import { logTokenUsage } from '@/features/ai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

type Item = Database['public']['Tables']['items']['Row']

// 1. СОЗДАНИЕ (Без векторов)
export async function createItemWithAI(text: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        content: text,
        status: 'inbox',
        type: 'task',
        metadata: { source: 'web' },
      })
      .select()
      .single()

    if (error) throw error
    revalidatePath('/')
    return { success: true, item: data }
  } catch (e: any) {
    return { error: e.message }
  }
}

// 2. ОБНОВЛЕНИЕ (С "Умной Векторизацией")
export async function updateItem(itemId: string, data: Partial<Item>) {
  const supabase = await createClient()

  // Проверяем, нужно ли генерировать вектор
  if (data.status && data.status !== 'inbox' && data.status !== 'deleted') {
    const { data: currentItem } = await supabase
      .from('items')
      .select('status, content, description, user_id')
      .eq('id', itemId)
      .single()

    if (currentItem?.status === 'inbox') {
      console.log(`🧠 Векторизация при переходе из Inbox: ${itemId}`)
      const textForEmbedding = `${currentItem.content} \n ${
        currentItem.description || ''
      }`.trim()

      const embeddingModel = 'openai/text-embedding-3-small'
      const embeddingResponse = await openai.embeddings.create({
        model: embeddingModel,
        input: textForEmbedding,
      })

      // Добавляем эмбеддинг к данным для обновления
      data.embedding = embeddingResponse.data[0].embedding

      if (embeddingResponse.usage && currentItem.user_id) {
        logTokenUsage({
          userId: currentItem.user_id, // Берем ID из задачи
          model: embeddingModel,
          action: 'embedding_on_promote', // Особый экшен
          inputTokens: embeddingResponse.usage.prompt_tokens,
          outputTokens: 0,
        })
      }
    }
  }

  // Логика planned_at
  if (data.status === 'today' && !data.planned_at) {
    data.planned_at = new Date().toISOString()
  }

  const { error } = await supabase.from('items').update(data).eq('id', itemId)

  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

// 3. МЯГКОЕ УДАЛЕНИЕ
export async function softDeleteItem(itemId: string) {
  return await updateItem(itemId, { status: 'deleted' })
}

// 4. ЖЕСТКОЕ УДАЛЕНИЕ
export async function hardDeleteItem(itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('items').delete().eq('id', itemId)

  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

// 5. ЗАВЕРШЕНИЕ
export async function completeItem(itemId: string) {
  return await updateItem(itemId, {
    status: 'done',
    completed_at: new Date().toISOString(),
  })
}

// 6. ОБНОВЛЕНИЕ ЛОГА
export async function updateExecutionLog(itemId: string, text: string) {
  return await updateItem(itemId, { execution_log: text })
}
