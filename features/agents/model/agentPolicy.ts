// features/agents/model/agentPolicy.ts

import { GEN_UI_REGISTRY } from '@/features/gen-ui'

/** Глобальные настройки поведения Адаптера */
export const ADAPTER_POLICY = {
  budget: {
    daily_limit_usd: 0.5,
    soft_limit_warning: 0.4,
  },
  prompts: {
    // Шаблон для склейки системного промпта
    system_template: (
      base: string,
      prefs: string,
      project: string,
      tools: string,
      currentDate: string
    ) =>
      `
        ${base}

        ---
        ТЕКУЩЕЕ ВРЕМЯ: ${currentDate}
        (Всегда используй эту дату для запросов отчётов и планирования).

        ---
        STRICT CONTEXT:
        ${prefs ? `USER_PREFS: ${prefs}` : ''}
        ${project ? `PROJECT_CONTEXT: ${project}` : ''}

        ---
        ${
          tools
            ? `AVAILABLE TOOLS & INTERFACES:
        ${tools}

        STRICT RULE:
        To use tools, add objects to the "commands" array.
        Structure: { "domain": "database" | "ui" | "system", "tool": "ID", "payload": {} }`
            : 'NO TOOLS AVAILABLE.'
        }
        `.trim(),

    // Техническая приписка для OpenAI/Groq (fix 400 error)
    openai_suffix: '\nIMPORTANT: Respond with valid RAW JSON only.',
  },
  get_ui_capabilities: (perms: string[]) => {
    const normalizedPerms = perms.map((p) => p.toLowerCase())
    return Object.values(GEN_UI_REGISTRY)
      .filter((t: any) =>
        normalizedPerms.includes(`ui:${t.type.toLowerCase()}`)
      )
      .map((t: any) => ({
        id: t.type,
        description: t.description,
        schema: t.jsonSchema,
      }))
  },
  defaults: {
    model: 'gemini-3-flash-preview',
    scope: 'general',
    max_iterations: 2, // Глобальный предел для безопасности
    enable_agentic_loop: false, // По умолчанию выключено
  },
}
