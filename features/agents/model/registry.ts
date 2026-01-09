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
    payload: any,
    context?: any
  ) => {
    let rawItems = []
    if (Array.isArray(payload)) {
      rawItems = payload
    } else if (payload.items && Array.isArray(payload.items)) {
      rawItems = payload.items
    } else {
      rawItems = [payload]
    }

    let targetScopeId = context?.scopeId
    const targetScopeName = context?.scope || 'general'

    // Если ID не пришел, но есть имя - ищем ID в базе
    if (!targetScopeId && targetScopeName) {
      const { data: scopeData } = await supabase
        .from('scopes')
        .select('id')
        .eq('slug', targetScopeName)
        .eq('user_id', userId) // Важно: ищем только свои
        .single()

      if (scopeData) targetScopeId = scopeData.id
    }

    // 2. Маппинг с ИНЪЕКЦИЕЙ СКОУПА
    const itemsToInsert = rawItems.map((i: any) => ({
      user_id: userId,
      content: i.content || i.title || 'Новая задача',
      description: i.description || null,
      type: i.type || 'task',
      priority: i.priority || 'medium',
      status: 'inbox',
      // ВАЖНО: Берем из payload, или из контекста, или дефолт
      scope: i.scope || context?.scope || 'general',
      scope_id: context?.scopeId || null, // <--- ВОТ ЭТОГО НЕ ХВАТАЛО
      metadata: i.parent_context ? { context_note: i.parent_context } : {},
    }))

    const { data, error } = await supabase
      .from('items')
      .insert(itemsToInsert)
      .select()
    if (error) throw error
    return data
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
  UPDATE_SCOPE_VIEW: async (
    supabase: SupabaseClient,
    userId: string,
    payload: { scopeId: string; view: string; config?: any }
  ) => {
    return await supabase
      .from('scopes')
      .update({
        view_type: payload.view,
        view_config: payload.config || {},
      })
      .eq('id', payload.scopeId)
  },
  // Инструмент для Летописца: Обновить манифест
  UPDATE_PROJECT_MANIFESTO: async (
    supabase: SupabaseClient,
    userId: string,
    payload: { scopeId: string; manifesto: string }
  ) => {
    return await supabase
      .from('scopes')
      .update({
        manifesto: payload.manifesto,
      })
      .eq('id', payload.scopeId)
  },
}
