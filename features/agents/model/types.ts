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
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
}

export interface AgentSessionResult extends AgentOutput {
  usage: AgentUsage
  execution_trace: ExecutionTrace[]
  finish_reason: AIFinishReason
  debug: {
    full_system_prompt: string
    full_user_prompt: string
    raw_ai_response: string
    total_duration_ms: number
  }
}

export interface AgentRunContext {
  scope: string
  query: string
  itemId?: string
  itemIds?: string[]
  isTest?: boolean
}

export interface ProviderResult {
  output: AgentOutput
  tokens: { input: number; output: number }
  raw_text: string
  finish_reason: AIFinishReason
}
