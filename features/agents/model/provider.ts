// features/agents/model/provider.ts
import { createAiClient } from '@/lib/ai/client'
import { logTokenUsage } from '@/features/ai/analytics'
import { AgentResponse, UnifiedAgentResponse } from './types'

interface RawAIResult {
  object: UnifiedAgentResponse
  usage: { input_tokens: number; output_tokens: number }
}

/**
 * Интеллектуальный нормализатор: превращает любой ответ ИИ в строгий формат AgentResponse
 */
function parseAndNormalize(text: string): AgentResponse {
  try {
    const cleanJson = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(cleanJson)

    const actions = parsed.actions || []

    // ИСПРАВЛЕНИЕ: Добавляем legacy-интент только если массив действий пуст
    if (actions.length === 0 && (parsed.intent || parsed.action)) {
      const legacyTool = String(parsed.intent || parsed.action).toUpperCase()
      const toolMap: Record<string, string> = {
        СОЗДАТЬ: 'CREATE_ITEMS',
        CREATE_CHILDREN: 'CREATE_ITEMS',
        UPDATE_ITEM: 'UPDATE_ITEM',
        ДЕКОМПОЗИЦИЯ: 'CREATE_ITEMS',
      }

      actions.push({
        type: 'database',
        tool: toolMap[legacyTool] || legacyTool,
        payload: parsed.data || parsed.tasks || parsed.content || {},
      })
    }

    // Нормализация инструментов (приведение к верхнему регистру и т.д.)
    const normalizedActions = actions.map((a: any) => ({
      type: a.type || 'database',
      tool: a.tool?.toUpperCase() || 'UPDATE_ITEM',
      payload: a.payload || {},
    }))

    return {
      thought: parsed.thought || '',
      content: parsed.content || parsed.message || '',
      actions: normalizedActions,
      log_message: parsed.log_message || 'Processed by Agent',
    }
  } catch (e) {
    console.error('Parse Error:', e)
    return {
      content: text,
      actions: [],
      log_message: 'Error parsing JSON',
    }
  }
}

async function callGoogle(
  model: string,
  system: string,
  prompt: string,
  userId: string
): Promise<RawAIResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 1,
        },
      }),
    }
  )

  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const text = data.candidates[0].content.parts[0].text

  if (data.usageMetadata) {
    logTokenUsage({
      userId,
      model,
      action: 'agent_call_google',
      inputTokens: data.usageMetadata.promptTokenCount || 0,
      outputTokens: data.usageMetadata.candidatesTokenCount || 0,
    }).catch((err) => console.error('Log failed:', err))
  }

  return {
    object: parseAndNormalize(text),
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount || 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
  }
}

async function callOpenAICompatible(
  config: any,
  system: string,
  prompt: string,
  userId: string
): Promise<RawAIResult> {
  const client = createAiClient({
    apiKey:
      config.provider === 'groq'
        ? process.env.GROQ_API_KEY
        : process.env.OPENROUTER_API_KEY,
    baseURL:
      config.provider === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : 'https://openrouter.ai/api/v1',
    userId,
    action: `agent_call_${config.provider}`,
  })

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 1,
  })

  return {
    object: parseAndNormalize(completion.choices[0].message.content || '{}'),
    usage: {
      input_tokens: completion.usage?.prompt_tokens || 0,
      output_tokens: completion.usage?.completion_tokens || 0,
    },
  }
}

export async function callAI(
  config: { provider: string; model: string },
  system: string,
  user: string,
  userId: string
): Promise<RawAIResult> {
  if (config.provider === 'google') {
    return await callGoogle(config.model, system, user, userId)
  }
  return await callOpenAICompatible(config, system, user, userId)
}
