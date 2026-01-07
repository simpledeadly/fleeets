export type AgentTaskDomain = 'database' | 'ui' | 'system'
export type CommandStatus =
  | 'success'
  | 'error'
  | 'blocked'
  | 'mocked'
  | 'interrupted'
export type AIFinishReason =
  | 'stop'
  | 'length'
  | 'content_filter'
  | 'tool_calls'
  | 'error'
  | 'unknown'

export type AgentErrorCode =
  | 'AI_TIMEOUT'
  | 'AI_AUTH_FAIL'
  | 'AI_QUOTA_REACHED'
  | 'INVALID_RESPONSE'
  | 'SECURITY_BLOCKED'
  | 'DATABASE_FAIL'
  | 'UNKNOWN'

export interface HumanError {
  code: AgentErrorCode
  message: string // Для юзера
  technical: string // Для тебя в логи
}

/** Переопределение настроек агента для тестирования */
export interface AgentOverride {
  system_prompt?: string
  model_settings?: any
}

export interface ContextBreakdown {
  system_base: number // Базовая роль агента
  user_manifesto: number // Глобальный манифест
  project_manifesto: number // Манифест проекта
  tools_definition: number // Описание инструментов и правил JSON
  user_query: number // Сам запрос
}

/** Метаданные провайдера (заголовки, статус, модель) */
export interface ProviderMetadata {
  status: number
  statusText: string
  model_id: string
  finish_reason: string
}

export interface AgentCommand {
  domain: AgentTaskDomain
  tool: string
  payload: Record<string, any>
}

export interface AgentOutput {
  thought?: string
  content: string
  commands: AgentCommand[]
  technical_log: string
}

export interface ExecutionTrace {
  tool: string
  domain: AgentTaskDomain
  status: CommandStatus
  input_payload: any
  output_data?: any
  error_details?: string
  validation_error?: boolean
}

export interface AgentUsage {
  model: string
  input: number
  output: number
  total_tokens: number
  cost_usd: number
}

export interface AgentSessionResult extends AgentOutput {
  usage: AgentUsage
  execution_trace: ExecutionTrace[]
  finish_reason: AIFinishReason
  error?: HumanError
  debug: {
    full_system_prompt: string
    full_user_prompt: string
    raw_ai_response: string
    total_duration_ms: number
    provider_meta?: ProviderMetadata
    breakdown: ContextBreakdown
  }
}

export interface AgentRunContext {
  scope: string
  query: string
  itemId?: string
  itemIds?: string[]
  isTest?: boolean
  agentOverride?: AgentOverride
}

export interface ProviderResult {
  output: AgentOutput
  tokens: { input: number; output: number }
  raw_text: string
  finish_reason: AIFinishReason
}
