// features/agents/model/logger.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { AgentAnalytics, AgentSessionResult } from './types'
import { PRICING } from './constants'

export const agentLogger = {
  async commit(
    userId: string,
    agentId: string,
    agentData: any,
    res: AgentSessionResult,
    isTest: boolean
  ) {
    const supabase = await createAdminClient()
    const { usage, debug, execution_trace } = res

    // 1. Расчет аналитики (легкие данные)
    const analytics: AgentAnalytics = {
      agent_id: agentId,
      agent_type: agentData.is_system ? 'system' : 'custom',
      model: usage.model,
      provider: agentData.model_settings?.provider || 'unknown',
      total_actions: execution_trace.length,
      db_mutations: execution_trace.filter(
        (t) => t.domain === 'database' && t.status === 'success'
      ).length,
      ui_renders: execution_trace.filter((t) => t.domain === 'ui').length,
      has_error: execution_trace.some((t) => t.status === 'error'),
      is_test: isTest,
      latency_ms: debug.total_duration_ms,
      cost_usd: usage.cost_usd,
      scope: agentData.scope || 'general',
    }

    // 2. Очистка чувствительных данных для Production-логов
    // В дебаг-логи пишем всё, в продакшн - только аналитику и суть
    const detailedLogs = isTest
      ? {
          prompts: {
            system: debug.full_system_prompt,
            user: debug.full_user_prompt,
          },
          raw_response: debug.raw_ai_response,
          trace: execution_trace,
        }
      : {
          trace_summary: execution_trace.map((t) => ({
            tool: t.tool,
            status: t.status,
          })),
        }

    // 1. Расчет стоимости
    const p = PRICING[usage.model] || PRICING['default']
    const calculatedCost =
      (usage.input * p.input + usage.output * p.output) / 1000000
    usage.cost_usd = calculatedCost

    // 2. Подготовка временных меток (исправляет ошибку NOT NULL)
    const now = new Date()
    const endedAt = now.toISOString()
    const startedAt = new Date(
      now.getTime() - debug.total_duration_ms
    ).toISOString()

    const [usageRes, activityRes] = await Promise.all([
      // Лог трат (деньги)
      supabase.from('usage_logs').insert({
        user_id: userId,
        model: usage.model,
        action: isTest ? 'agent_test' : 'agent_run',
        input_tokens: usage.input,
        output_tokens: usage.output,
        cost_usd: calculatedCost,
      }),
      // Лог активности (полный дамп)
      supabase.from('activity_logs').insert({
        user_id: userId,
        source: 'agent_adapter',
        category: isTest ? 'agent.test' : 'agent.run',
        started_at: startedAt,
        ended_at: endedAt,
        details: {
          ...analytics,
          ...detailedLogs,
        },
      }),
    ])

    if (usageRes.error || activityRes.error) {
      console.error('❌ [LOGGER_ERROR]:', {
        usageErr: usageRes.error,
        activityErr: activityRes.error,
      })
    }
  },
}
