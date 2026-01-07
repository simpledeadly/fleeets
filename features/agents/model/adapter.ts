/* eslint-disable @typescript-eslint/no-unused-vars */
// features/agents/model/adapter.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { callGoogle } from './providerGoogle'
import { callOpenAICompatible } from './providerOpenai'
import { AgentSessionResult, AgentRunContext } from './types'
import { agentLogger } from './logger'
import {
  getProjectManifesto,
  calculateUsage,
  calculateBreakdown,
} from './logic'
import { executeCommands } from './executor'
import { GEN_UI_REGISTRY } from '@/features/gen-ui/registry'
import { validateDailyBudget } from './guard'

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

  try {
    await validateDailyBudget(supabase, userId, 0.5)
  } catch (e) {
    // Формируем "безопасный" ответ об ошибке для UI
    return {
      content:
        'Дневной лимит ИИ-запросов исчерпан. Попробуйте завтра или обратитесь в поддержку.',
      commands: [],
      technical_log: 'GUARD_BLOCKED: BUDGET_EXCEEDED',
      usage: {
        model: 'guard',
        input: 0,
        output: 0,
        total_tokens: 0,
        cost_usd: 0,
      },
      execution_trace: [],
      finish_reason: 'error',
      debug: {
        full_system_prompt: '',
        full_user_prompt: context.query,
        raw_ai_response: 'Blocked by Budget Guard',
        total_duration_ms: Date.now() - start,
        breakdown: {} as any,
      },
    }
  }

  // 1. Получаем Агента (Override для реактивности в Плейграунде)
  const { data: agentData } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()
  const agent =
    isTest && context.agentOverride
      ? { ...agentData, ...context.agentOverride }
      : agentData
  if (!agent) throw new Error('AGENT_NOT_FOUND')

  const perms = agent.model_settings?.permissions || {
    tools: [],
    user_manifesto: false,
    project_manifesto: false,
  }

  // 2. Сбор разрешенного контекста
  const [profile, projectDesc] = await Promise.all([
    perms.user_manifesto
      ? supabase.from('profiles').select('manifesto').eq('id', userId).single()
      : { data: null },
    perms.project_manifesto
      ? getProjectManifesto(supabase, context.scope, context.itemId)
      : Promise.resolve('Hidden'),
  ])

  // 3. Формирование инструментов (только разрешенных)
  const allowedTools =
    perms.tools?.length > 0
      ? {
          database: perms.tools
            .filter((t: string) => t.startsWith('database:'))
            .map((t: string) => t.split(':')[1]),
          ui: Object.values(GEN_UI_REGISTRY)
            .filter((t: any) => perms.tools.includes(`ui:${t.id}`))
            .map((t: any) => ({ id: t.id, schema: t.jsonSchema })),
        }
      : null

  // 4. Сборка промпта-конструктора
  const systemParts = [agent.system_prompt]
  if (profile.data?.manifesto)
    systemParts.push(`USER_PREFS: ${profile.data.manifesto}`)
  if (projectDesc !== 'Hidden')
    systemParts.push(`PROJECT_CONTEXT: ${projectDesc}`)
  if (allowedTools) {
    systemParts.push(
      `AVAILABLE TOOLS: ${JSON.stringify(
        allowedTools
      )}\nSTRICT RULE: To use tools, add to "commands" array: { domain: "database"|"ui", tool: "ID", payload: {} }`
    )
  }
  const finalSystemPrompt = systemParts.join('\n\n---\n')

  // 5. Вызов ИИ
  const res =
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

  // 6. Исполнение и сборка итога
  const safeTokens = {
    input: res.tokens?.input ?? 0,
    output: res.tokens?.output ?? 0,
  }
  const trace = await executeCommands(
    supabase,
    userId,
    res.output.commands,
    perms.tools || [],
    isTest
  )

  const finalResult: AgentSessionResult = {
    ...res.output,
    usage: calculateUsage(agent.model_settings.model, safeTokens),
    execution_trace: trace,
    finish_reason: res.finish_reason,
    debug: {
      full_system_prompt: finalSystemPrompt,
      full_user_prompt: context.query,
      raw_ai_response: res.raw_text,
      total_duration_ms: Date.now() - start,
      breakdown: calculateBreakdown(
        agent,
        profile.data,
        projectDesc,
        allowedTools ? JSON.stringify(allowedTools) : '',
        context.query,
        safeTokens.input
      ),
    },
  }

  // 7. Логирование через наш внутренний агент-логгер
  await agentLogger.commit(userId, agentId, agent, finalResult, isTest)

  return finalResult
}
