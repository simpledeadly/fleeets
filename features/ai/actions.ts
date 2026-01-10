'use server'

import { createClient } from '../../lib/supabase/server'
import { logTokenUsage } from './analytics'

export async function findSimilarItems(itemId: string) {
  const supabase = await createClient()

  // 1. Получаем вектор
  const { data: currentItem } = await supabase
    .from('items')
    .select('embedding, content')
    .eq('id', itemId)
    .single()

  if (!currentItem?.embedding) {
    console.log('[RAG] У этой задачи нет вектора (embedding is null)')
    return []
  }

  // 2. Ищем похожие
  console.log(`🔍 [RAG] Ищем похожие для: "${currentItem.content}"`)

  const { data: similarItems, error } = await supabase.rpc('match_items', {
    query_embedding: currentItem.embedding,
    match_threshold: 0.4,
    match_count: 10,
    user_id_input: (await supabase.auth.getUser()).data.user?.id,
  })

  if (error) {
    console.error('❌ [RAG] Ошибка RPC:', error)
    return []
  }

  // Логируем, что нашли (вместе со скором)
  console.log(
    '✅ [RAG] Найдено:',
    similarItems?.map((i: any) => `${i.content} (${i.similarity})`)
  )

  // Фильтруем саму себя
  return similarItems?.filter((i: any) => i.id !== itemId) || []
}

export async function transcribeAudio(audioBlob: Blob) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY) {
    return { success: false, error: 'GROQ_API_KEY is not set.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-large-v3')
    formData.append('response_format', 'verbose_json')

    const response = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error.message || 'Groq API error')
    }

    const data = await response.json()
    const text = data.text
    const duration = data.duration || 0 // Groq возвращает duration в секундах

    // 📊 ЛОГ
    if (user) {
      logTokenUsage({
        userId: user.id,
        model: 'whisper-large-v3',
        action: 'transcription',
        seconds: duration, // Передаем секунды!
      })
    }

    return { success: true, text }
  } catch (e: any) {
    console.error('Transcription Error (Groq):', e)
    return { success: false, error: e.message }
  }
}
