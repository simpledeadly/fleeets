// features/agents/model/agentPolicy.ts

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
      tools: string
    ) =>
      `
        ${base}

        ---
        STRICT CONTEXT:
        ${prefs ? `USER_PREFS: ${prefs}` : ''}
        ${project ? `PROJECT_CONTEXT: ${project}` : ''}

        ---
        ${
          tools
            ? `AVAILABLE TOOLS:\n${tools}\n\nSTRICT ACTION RULE: To use tools, fill "commands" array.`
            : 'NOTE: No tools allowed for this agent.'
        }
      `.trim(),

    // Техническая приписка для OpenAI/Groq (fix 400 error)
    openai_suffix: '\nIMPORTANT: Respond with valid RAW JSON only.',
  },
  defaults: {
    model: 'gemini-3-flash-preview',
    scope: 'general',
  },
}
