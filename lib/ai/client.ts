import OpenAI from 'openai'
import { logTokenUsage } from '@/features/ai/analytics'

/**
 * Обертка для OpenAI клиента, которая автоматически логирует использование токенов.
 */
export function createAiClient(config: {
  apiKey?: string
  baseURL?: string
  userId: string
  action: string
}) {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  // Перехватываем метод создания чата
  const originalChatCreate = client.chat.completions.create.bind(
    client.chat.completions
  )
  // @ts-ignore
  client.chat.completions.create = async function (...args: any[]) {
    // @ts-ignore
    const response = await originalChatCreate(...args)

    if ('usage' in response && response.usage) {
      logTokenUsage({
        userId: config.userId,
        model: response.model,
        action: config.action,
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
      }).catch((err) => console.error('Auto-logging AI usage failed:', err))
    }

    return response
  }

  // Перехватываем метод создания эмбеддингов
  const originalEmbeddingsCreate = client.embeddings.create.bind(
    client.embeddings
  )
  // @ts-ignore
  client.embeddings.create = async function (...args: any[]) {
    // @ts-ignore
    const response = await originalEmbeddingsCreate(...args)

    if (response.usage) {
      logTokenUsage({
        userId: config.userId,
        model: response.model,
        action: config.action,
        inputTokens: response.usage.prompt_tokens,
        outputTokens: 0,
      }).catch((err) => console.error('Auto-logging AI embedding failed:', err))
    }

    return response
  }

  return client
}
