// features/agents/model/adapter.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI } from './provider'
import { TOOL_REGISTRY } from './registry'
import { AgentContext, AgentResponse, AgentUsage } from './types'
import { GEN_UI_REGISTRY } from '@/features/gen-ui/registry'
import { logTokenUsage } from '@/features/ai/analytics'

/**
 * Логика получения манифеста проекта по иерархии
 */
async function getProjectManifesto(
  supabase: any,
  scope: string,
  itemId?: string
) {
  if (itemId) {
    const { data } = await supabase
      .from('items')
      .select('parent:parent_id(description)')
      .eq('id', itemId)
      .single()
    if (data?.parent?.description) return data.parent.description
  }
  return `Текущий Scope: ${scope}`
}

/**
 * Универсальный логгер действий и затрат
 */
async function logEverything(
  supabase: any,
  userId: string,
  agent: any,
  aiRes: AgentResponse,
  usage: AgentUsage,
  duration: number,
  isTest: boolean
) {
  await Promise.all([
    // 1. Логирование денег
    logTokenUsage({
      userId,
      model: usage.model,
      action: isTest ? 'agent_test_call' : 'agent_call',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    }).catch((err) => console.error('Usage log failed:', err)),

    // 2. Логирование действий в историю
    supabase.from('activity_logs').insert({
      user_id: userId,
      source: 'agent_adapter',
      category: isTest ? 'agent.test_execute' : 'agent.execute',
      details: {
        agentId: agent.id,
        agentName: agent.name,
        actions_count: aiRes.actions.length,
        duration_ms: duration,
        log: aiRes.log_message,
        usage: usage,
        isTest,
      },
    }),
  ])
}

export async function processAgentTask({
  agentId,
  userId,
  context,
  isTest = false,
}: {
  agentId: string
  userId: string
  context: AgentContext
  isTest?: boolean
}) {
  const supabase = await createAdminClient()
  const startTime = Date.now()

  // 1. Получаем настройки Агента
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (agentErr || !agent) throw new Error('Agent not found')

  const perms = agent.model_settings?.permissions || {
    user_manifesto: false,
    project_manifesto: false,
    tools: [],
  }

  // 2. Сбор разрешенного контекста
  const [profileReq, projectDesc] = await Promise.all([
    perms.user_manifesto
      ? supabase.from('profiles').select('manifesto').eq('id', userId).single()
      : Promise.resolve({ data: null }),
    perms.project_manifesto
      ? getProjectManifesto(supabase, context.scope, context.itemId)
      : Promise.resolve('Доступ к контексту проекта ограничен.'),
  ])

  // 3. Сбор разрешенных инструментов
  const allowedTools = {
    database: Object.keys(TOOL_REGISTRY.database).filter((t) =>
      perms.tools?.includes(`database:${t}`)
    ),
    ui: Object.values(GEN_UI_REGISTRY)
      .filter((t: any) => perms.tools?.includes(`ui:${t.id}`))
      .map((t: any) => ({
        id: t.id,
        description: t.description,
        schema: t.jsonSchema,
      })),
  }

  // 4. Формирование System Prompt
  const systemPrompt = `
${agent.system_prompt}

---
ДОСТУПНЫЙ КОНТЕКСТ:
${
  profileReq.data
    ? `ЛИЧНЫЕ ПРЕДПОЧТЕНИЯ ЮЗЕРА: ${profileReq.data.manifesto}`
    : ''
}
МАНИФЕСТ ПРОЕКТА: ${projectDesc}

---
ДОСТУПНЫЕ ИНСТРУМЕНТЫ (Actions):
Если тебе нужно выполнить действие в БД или отобразить UI, добавь объект в массив "actions".
${JSON.stringify(allowedTools, null, 2)}

---
ПРАВИЛО ОТВЕТА:
Верни строго JSON. Поля: thought (опц), content (обяз), actions (обяз), log_message (обяз).
  `.trim()

  // 5. ЕДИНСТВЕННЫЙ Вызов ИИ
  const { object: aiResult, usage: rawUsage } = await callAI(
    agent.model_settings,
    systemPrompt,
    context.query,
    userId
  )

  const executionResults: any[] = []

  // 6. Исполнение Database Actions (строгая проверка прав)
  for (const action of aiResult.actions || []) {
    const isAllowed = perms.tools?.includes(`${action.type}:${action.tool}`)

    if (!isAllowed) {
      executionResults.push({
        tool: action.tool,
        status: 'blocked',
        error: 'Permission denied: Tool not allowed.',
      })
      continue
    }

    if (action.type === 'database') {
      if (isTest) {
        executionResults.push({
          tool: action.tool,
          status: 'mocked',
          payload: action.payload,
        })
      } else {
        const handler = (TOOL_REGISTRY.database as any)[action.tool]
        if (handler) {
          const res = await handler(supabase, userId, action.payload)
          executionResults.push({
            tool: action.tool,
            status: 'success',
            data: res,
          })
        }
      }
    }
  }

  // 7. Расчет итоговой стоимости
  const PRICING: Record<string, any> = {
    'gemini-2.0-flash-exp': { input: 0, output: 0 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  }

  const modelKey = agent.model_settings.model
  const price = PRICING[modelKey] || { input: 0, output: 0 }

  const finalUsage: AgentUsage = {
    model: modelKey,
    input_tokens: rawUsage.input_tokens,
    output_tokens: rawUsage.output_tokens,
    total_tokens: rawUsage.input_tokens + rawUsage.output_tokens,
    cost_usd:
      (rawUsage.input_tokens * price.input +
        rawUsage.output_tokens * price.output) /
      1_000_000,
  }

  // 8. Логирование
  await logEverything(
    supabase,
    userId,
    agent,
    aiResult,
    finalUsage,
    Date.now() - startTime,
    isTest
  )

  return {
    ...aiResult,
    usage: finalUsage,
    test_report: isTest ? executionResults : null,
  }
}
