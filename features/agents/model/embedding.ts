import { createAiClient } from '@/lib/ai/client'

export async function getEmbedding(
  text: string,
  userId: string
): Promise<number[]> {
  const client = createAiClient({
    apiKey: process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    userId,
    action: 'embedding_generation',
  })

  // Используем text-embedding-3-small как стандарт
  const response = await client.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: text.replace(/\n/g, ' '),
  })

  return response.data[0].embedding
}
