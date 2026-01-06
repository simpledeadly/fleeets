// features/agents/model/provider.ts
import { createAiClient } from '@/lib/ai/client'
import { logTokenUsage } from '@/features/ai/analytics'
import { AgentResponse } from './types'

/**
 * Вспомогательная функция для чистки и парсинга любого JSON от ИИ
 */
function parseAndNormalize(text: string): AgentResponse {
  try {
    const cleanJson = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(cleanJson)

    // 1. МАППИНГ ИНТЕНТОВ (Русский -> Системный)
    const intentMap: Record<string, string> = {
      СОЗДАТЬ: 'CREATE_CHILDREN',
      ДЕКОМПОЗИЦИЯ: 'CREATE_CHILDREN',
      ОБНОВИТЬ: 'UPDATE_ITEM',
      АНАЛИЗ: 'UPDATE_ITEM',
      ПЛАН: 'CREATE_CHILDREN',
    }

    const rawIntent = String(
      parsed.intent || parsed.action || 'UPDATE_ITEM'
    ).toUpperCase()
    const intent = intentMap[rawIntent] || rawIntent

    // 2. НОРМАЛИЗАЦИЯ МАССИВА ДАННЫХ (data/tasks)
    let rawData = parsed.data || parsed.tasks || parsed.items || []
    if (!Array.isArray(rawData)) rawData = []

    const normalizedData = rawData.map((item: any) => {
      if (typeof item === 'string') return { content: item }
      return {
        // Если ИИ написал "task" или "name" вместо "content", исправляем
        content:
          item.content ||
          item.task ||
          item.name ||
          item.title ||
          'Новая подзадача',
        priority: item.priority || 'medium',
        metadata: item.metadata || {},
      }
    })

    return {
      intent: intent as any,
      content: parsed.content || parsed.message || parsed.description || '',
      data: normalizedData,
      log_message: parsed.log_message || parsed.log || 'OK',
    }
  } catch (e) {
    return {
      intent: 'UPDATE_ITEM',
      content: text,
      log_message: `Fallback: ${e}`,
    }
  }
}

async function callGoogle(
  model: string,
  system: string,
  prompt: string,
  userId: string
): Promise<AgentResponse> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )

  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const text = data.candidates[0].content.parts[0].text

  // Логируем токены Google
  if (data.usageMetadata) {
    logTokenUsage({
      userId: userId,
      model: model,
      action: 'agent_call_google',
      inputTokens: data.usageMetadata.promptTokenCount,
      outputTokens: data.usageMetadata.candidatesTokenCount,
    }).catch((err) => console.error('Google usage log failed:', err))
  }

  return parseAndNormalize(text)
}

async function callOpenAICompatible(
  config: any,
  system: string,
  prompt: string,
  userId: string
): Promise<AgentResponse> {
  const client = createAiClient({
    apiKey:
      config.provider === 'groq'
        ? process.env.GROQ_API_KEY
        : process.env.OPENROUTER_API_KEY,
    baseURL:
      config.provider === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : 'https://openrouter.ai/api/v1',
    userId: userId,
    action: `agent_call_${config.provider}`,
  })

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: system + '\nAlways return JSON.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const content = completion.choices[0].message.content || '{}'
  return parseAndNormalize(content)
}

export async function callAI(
  config: { provider: string; model: string },
  system: string,
  user: string,
  userId: string
): Promise<AgentResponse> {
  if (config.provider === 'google') {
    return await callGoogle(config.model, system, user, userId)
  }
  return await callOpenAICompatible(config, system, user, userId)
}
