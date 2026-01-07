export type AgentActionType = 'database' | 'ui' | 'system'

// features/agents/model/types.ts

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
export interface ExecutionStep {
  tool: string
  type: string
  status: string
  payload: any
  message?: string
}
export interface AgentResponse extends UnifiedAgentResponse {
  usage: AgentUsage
  execution_steps: ExecutionStep[]
  debug?: {
    full_system_prompt: string
    full_user_prompt: string
    raw_ai_response: string
    duration_ms: number
  }
}
export interface RawAIResult {
  object: UnifiedAgentResponse
  usage: { input_tokens: number; output_tokens: number }
  raw_text: string
}

export interface AgentRunOptions {
  itemId?: string
  itemIds?: string[]
  query?: string
  scope?: string
  isTest?: boolean
  customInput?: string
}
