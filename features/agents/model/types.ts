export type AgentActionType = 'database' | 'ui' | 'system'

export interface AgentUsage {
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
}

export interface AgentAction {
  type: 'database' | 'ui' | 'system'
  tool: string
  payload: any
}

export interface UnifiedAgentResponse {
  thought?: string
  content: string
  actions: AgentAction[]
  log_message: string
}

// Финальный ответ системы
export interface AgentResponse extends UnifiedAgentResponse {
  usage?: AgentUsage
  test_report?: any[] | null
}

export interface AgentContext {
  query: string
  scope: string
  itemId?: string
  itemIds?: string[]
  availableTools?: string[]
}

export interface AgentRunOptions {
  itemId?: string
  itemIds?: string[]
  query?: string
  scope?: string
  isTest?: boolean
  customInput?: string
}
