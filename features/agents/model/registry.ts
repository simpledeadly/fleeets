import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getEmbedding } from './embedding'

export const TOOL_SCHEMAS = {
  CREATE_ITEMS: z.array(
    z.object({
      content: z.string().min(1),
      type: z.string().default('task'),
      priority: z.string().optional(),
      scope: z.string().optional(),
    })
  ),
  UPDATE_ITEM: z.object({
    id: z.uuid(),
    description: z.string().optional(),
    status: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  RAG_SEARCH: z.object({
    query: z.string().min(1),
    limit: z.number().optional().default(5),
  }),
  FETCH_REPORT: z.object({
    type: z.enum(['daily', 'weekly']),
    date: z.string().optional(),
  }),
}

export const SYSTEM_TOOLS = {
  RAG_SEARCH: async (
    supabase: SupabaseClient,
    userId: string,
    payload: any
  ) => {
    const queryVector = await getEmbedding(payload.query, userId)
    const { data, error } = await supabase.rpc('match_items', {
      query_embedding: queryVector,
      match_threshold: 0.3,
      match_count: payload.limit || 10,
      user_id_input: userId,
      filter_scope: 'all',
    })
    if (error) {
      console.error('🔴 RPC match_items error:', error)
      throw error
    }
    return data
  },
  FETCH_REPORT: async (
    supabase: SupabaseClient,
    userId: string,
    payload: any
  ) => {
    const rpcName =
      payload.type === 'daily' ? 'get_daily_report' : 'get_weekly_report'
    const args =
      payload.type === 'daily'
        ? {
            user_uuid: userId,
            target_date: payload.date || new Date().toISOString(),
          }
        : { user_uuid: userId }
    const { data, error } = await supabase.rpc(rpcName, args)
    if (error) throw error
    return data
  },
}

export const DATABASE_TOOLS = {
  CREATE_ITEMS: async (
    supabase: SupabaseClient,
    userId: string,
    payload: any
  ) => {
    const valid = TOOL_SCHEMAS.CREATE_ITEMS.parse(payload)
    return await supabase
      .from('items')
      .insert(valid.map((i) => ({ ...i, user_id: userId })))
  },
  UPDATE_ITEM: async (
    supabase: SupabaseClient,
    userId: string,
    payload: any
  ) => {
    const valid = TOOL_SCHEMAS.UPDATE_ITEM.parse(payload)
    return await supabase
      .from('items')
      .update(valid)
      .eq('id', valid.id)
      .eq('user_id', userId)
  },
}
