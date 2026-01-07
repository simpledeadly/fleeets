import { createAdminClient } from '@/lib/supabase/admin'
import { callGoogle } from './providerGoogle'
import { callOpenAICompatible } from './providerOpenai'
import { DATABASE_TOOLS } from './registry'
import {
  AgentSessionResult,
  ExecutionTrace,
  AgentUsage,
  AgentRunContext,
  AgentErrorCode,
} from './types'
import { PRICING } from './constants'
import { agentLogger } from './logger'

/**
 * Извлекает манифест проекта: либо из описания родителя (если есть itemId),
 * либо возвращает название текущего Scope.
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

const ERROR_MAP: Record<string, { msg: string; code: AgentErrorCode }> = {
  '401': { msg: 'Ошибка авторизации AI. Проверь ключи.', code: 'AI_AUTH_FAIL' },
  '429': {
    msg: 'Лимит запросов исчерпан. Подожди немного.',
    code: 'AI_QUOTA_REACHED',
  },
  JSON_PARSE_ERROR: {
    msg: 'ИИ прислал битые данные. Попробуй еще раз.',
    code: 'INVALID_RESPONSE',
  },
}

export async function processAgentTask({
  agentId,
  userId,
  context,
  isTest = false,
}: {
  agentId: string
  userId: string
  context: AgentRunContext
  isTest?: boolean
}): Promise<AgentSessionResult> {
  const supabase = await createAdminClient()
  const start = Date.now()

  let agent: any
  if (isTest && context.agentOverride) {
    agent = { id: agentId, name: 'DRAFT_TEST', ...context.agentOverride }
  } else {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()
    agent = data
  }
  if (!agent) throw new Error('Agent not found')

  const rawPerms = agent.model_settings?.permissions?.tools
  const perms = Array.isArray(rawPerms) ? rawPerms : []

  const hasTools = perms.length > 0
  const userManifestoPerm =
    agent.model_settings?.permissions?.user_manifesto ?? false
  const projectManifestoPerm =
    agent.model_settings?.permissions?.project_manifesto ?? false

  // 2. Сбор данных только по разрешению (Экономия токенов)
  const [profile, projectDesc] = await Promise.all([
    userManifestoPerm
      ? supabase.from('profiles').select('manifesto').eq('id', userId).single()
      : { data: null },
    projectManifestoPerm
      ? getProjectManifesto(supabase, context.scope, context.itemId)
      : Promise.resolve('Context Hidden'),
  ])

  const allowedTools = perms.map((p) => p.toUpperCase()) // ["DATABASE:CREATE_ITEMS", "UI:DECOMPOSITION_TREE"]

  // 4. СБОРКА ПРОМПТА (Универсальная инструкция)
  const systemParts = [agent.system_prompt]
  if (userManifestoPerm && profile.data?.manifesto)
    systemParts.push(`USER_PREFS: ${profile.data.manifesto}`)
  if (projectManifestoPerm) systemParts.push(`PROJECT_CONTEXT: ${projectDesc}`)

  if (hasTools) {
    const toolsStr = perms.map((p) => p.toUpperCase()).join(', ')
    systemParts.push(
      `
        AVAILABLE TOOLS:
        ${toolsStr}
        
        STRICT ACTION RULE:
        To use a tool, you MUST add an object to the "actions" array.
        Structure: { "domain": "database" | "ui" | "system", "tool": "ID", "payload": {} }
        The "tool" field must be the second part of the ID (e.g., if ID is "DATABASE:CREATE_ITEMS", tool is "CREATE_ITEMS").
      `.trim()
    )
  }

  const finalSystemPrompt = systemParts.join('\n\n---\n')

  const providerRes =
    agent.model_settings.provider === 'google'
      ? await callGoogle(
          agent.model_settings.model,
          finalSystemPrompt,
          context.query
        )
      : await callOpenAICompatible(
          agent.model_settings,
          finalSystemPrompt,
          context.query
        )

  if (!providerRes || !providerRes.tokens) {
    console.error(
      '❌ [ADAPTER_FATAL] Provider response is corrupted:',
      providerRes
    )
    throw new Error('PROVIDER_RESPONSE_INVALID: Check server logs for raw data')
  }

  const trace: ExecutionTrace[] = []
  for (const cmd of providerRes.output.commands) {
    const toolId = `${cmd.domain}:${cmd.tool}`
    const isAllowed = perms.includes(toolId)

    if (!isAllowed) {
      trace.push({
        tool: cmd.tool,
        domain: cmd.domain,
        status: 'blocked',
        input_payload: cmd.payload,
        error_details: `Access denied for ${toolId}`,
      })
      continue
    }

    try {
      if (isTest) {
        trace.push({
          tool: cmd.tool,
          domain: cmd.domain,
          status: 'mocked',
          input_payload: cmd.payload,
        })
      } else if (cmd.domain === 'database') {
        const handler = (DATABASE_TOOLS as any)[cmd.tool]
        if (!handler) throw new Error(`Tool ${cmd.tool} not found in Registry`)
        const res = await handler(supabase, userId, cmd.payload)
        trace.push({
          tool: cmd.tool,
          domain: cmd.domain,
          status: res.error ? 'error' : 'success',
          input_payload: cmd.payload,
          error_details: res.error?.message,
        })
      }
    } catch (e: any) {
      trace.push({
        tool: cmd.tool,
        domain: cmd.domain,
        status: 'error',
        input_payload: cmd.payload,
        error_details: e.message,
      })
    }
  }

  const p = PRICING[agent.model_settings.model] || PRICING['default']

  const usage: AgentUsage = {
    model: agent.model_settings.model,
    input: providerRes.tokens.input ?? 0,
    output: providerRes.tokens.output ?? 0,
    total_tokens:
      (providerRes.tokens.input ?? 0) + (providerRes.tokens.output ?? 0),
    cost_usd:
      (providerRes.tokens.input * p.input +
        providerRes.tokens.output * p.output) /
      1000000,
  }

  const finalResult: AgentSessionResult = {
    ...providerRes.output,
    usage,
    execution_trace: trace,
    finish_reason: providerRes.finish_reason,
    debug: {
      full_system_prompt: finalSystemPrompt,
      full_user_prompt: context.query,
      raw_ai_response: providerRes.raw_text,
      total_duration_ms: Date.now() - start,
      breakdown: calculateBreakdown(
        agent,
        profile.data,
        projectDesc,
        hasTools ? JSON.stringify(allowedTools) : '',
        context.query,
        providerRes.tokens.input
      ),
    },
  }

  await agentLogger.commit(supabase, userId, agentId, finalResult, isTest)

  return finalResult
}

/** Вспомогательная функция для расчета веса (вынесена для чистоты кода) */
function calculateBreakdown(
  agent: any,
  profile: any,
  project: any,
  tools: string,
  query: string,
  totalTokens: number
) {
  const weights = {
    system_base: agent.system_prompt.length,
    user_manifesto: profile?.manifesto?.length || 0,
    project_manifesto: project?.length || 0,
    tools_definition: tools.length,
    user_query: query.length,
  }
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  return {
    system_base: Math.round((weights.system_base / totalWeight) * totalTokens),
    user_manifesto: Math.round(
      (weights.user_manifesto / totalWeight) * totalTokens
    ),
    project_manifesto: Math.round(
      (weights.project_manifesto / totalWeight) * totalTokens
    ),
    tools_definition: Math.round(
      (weights.tools_definition / totalWeight) * totalTokens
    ),
    user_query: Math.round((weights.user_query / totalWeight) * totalTokens),
  }
}
