// features/agents/model/logic.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { PRICING } from './constants'
import { AgentUsage } from './types'

export async function getProjectManifesto(
  supabase: SupabaseClient,
  scope: string,
  itemId?: string
) {
  if (itemId) {
    const { data } = await supabase
      .from('items')
      .select('parent:parent_id(description)')
      .eq('id', itemId)
      .single()
    // @ts-ignore
    if (data?.parent?.description) return data.parent.description
  }
  return `Scope: ${scope}`
}

export function calculateUsage(
  model: string,
  tokens: { input: number; output: number }
): AgentUsage {
  const p = PRICING[model] || PRICING['default'] || { input: 0, output: 0 }
  const cost = (tokens.input * p.input + tokens.output * p.output) / 1000000
  return {
    model,
    input: tokens.input,
    output: tokens.output,
    total_tokens: tokens.input + tokens.output,
    cost_usd: cost,
  }
}

export function calculateBreakdown(
  agent: any,
  profile: any,
  project: any,
  tools: string,
  query: string,
  totalTokens: number
) {
  const weights = {
    base: agent.system_prompt.length,
    user: profile?.manifesto?.length || 0,
    proj: project?.length || 0,
    tools: tools.length,
    query: query.length,
  }
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1
  const ratio = totalTokens / totalWeight
  return {
    system_base: Math.round(weights.base * ratio),
    user_manifesto: Math.round(weights.user * ratio),
    project_manifesto: Math.round(weights.proj * ratio),
    tools_definition: Math.round(weights.tools * ratio),
    user_query: Math.round(weights.query * ratio),
  }
}
