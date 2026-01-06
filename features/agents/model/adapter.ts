/* eslint-disable @typescript-eslint/no-unused-vars */
// features/agents/model/core.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI } from './provider'
import { IntentHandlers } from './handlers'

export async function processAgentTask({
  itemId,
  agentId,
  userId,
  customInput,
}: any) {
  const supabase = await createAdminClient()

  const [itemReq, agentReq, profileReq] = await Promise.all([
    supabase.from('items').select('*').eq('id', itemId).single(),
    supabase.from('agents').select('*').eq('id', agentId).single(),
    supabase.from('profiles').select('manifesto').eq('id', userId).single(),
  ])

  if (!itemReq.data || !agentReq.data) throw new Error('Data not found')

  const item = itemReq.data
  const agent = agentReq.data
  const userManifesto = profileReq.data?.manifesto || ''

  const systemPrompt = `
    ${agent.system_prompt}

    ---
    CRITICAL JSON RULES:
    1. You must output a JSON object with EXACTLY these keys: "intent", "content", "data", "log_message".
    2. NEVER translate the keys.
    3. Put your MAIN RESPONSE (code, text, or instructions) into the "content" field.
    4. If you are creating tasks, put them in the "data" array.
    `.trim()

  const userContext = `
    [DATA_TO_PROCESS]
    ${item.content}
    ${item.description || ''}
    [/DATA_TO_PROCESS]
    
    Generate result now.
  `.trim()

  // Вызываем ИИ и получаем ГАРАНТИРОВАННО нормализованный ответ
  const result = await callAI(
    agent.model_settings,
    systemPrompt,
    userContext,
    userId
  )

  // Выполнение действий в БД
  const handler =
    IntentHandlers[result.intent as keyof typeof IntentHandlers] ||
    IntentHandlers.UPDATE_ITEM

  const payload = result.intent === 'CREATE_CHILDREN' ? result.data : result

  await Promise.all([
    handler(supabase, item, payload),
    supabase.from('activity_logs').insert({
      user_id: userId,
      source: 'agent_adapter',
      category: `agent.execute`,
      details: {
        agentName: agent.name,
        intent: result.intent,
        itemId: item.id,
      },
    }),
  ])

  // Возвращаем нормализованный объект фронтенду
  return result
}
