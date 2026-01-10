import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getEmbedding } from './embedding'

const ItemSchema = z.object({
  content: z.string().min(1),
  type: z.string().default('task'),
  priority: z.string().optional(),
  description: z.string().optional(),
  parent_context: z.string().optional(),
})

export const TOOL_SCHEMAS = {
  CREATE_ITEMS: z.union([
    z.array(ItemSchema),
    z.object({ items: z.array(ItemSchema) }),
  ]),

  UPDATE_ITEM: z.object({
    id: z.uuid(),
    description: z.string().optional(),
    status: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),

  CREATE_BLUEPRINT: z.object({
    title: z.string(),
    description: z.string().optional(),
    new_items: z.array(ItemSchema),
    include_ids: z.array(z.string()).optional(),
    exclude_ids: z.array(z.string()).optional(),
    relations: z
      .array(
        z.object({
          item_id: z.string().describe('ID существующей задачи'),
          parent_context: z
            .string()
            .describe(
              'Название Фазы (новой или старой), куда перенести эту задачу'
            ),
        })
      )
      .optional(),
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
    payload: any,
    context?: any
  ) => {
    const queryVector = await getEmbedding(payload.query, userId)
    const targetScopeId = payload.global ? null : context?.scopeId
    const { data, error } = await supabase.rpc('match_items', {
      query_embedding: queryVector,
      match_threshold: 0.35,
      match_count: payload.limit || 10,
      user_id_input: userId,
      filter_scope_id: targetScopeId,
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

    const targetScopeId = context?.scopeId || null

    const agentId = context?.agentId || null

    // 2. Маппинг с ИНЪЕКЦИЕЙ СКОУПА
    const itemsToInsert = rawItems.map((i: any) => ({
      user_id: userId,
      content: i.content || i.title || 'Новая задача',
      description: i.description || null,
      type: i.type || 'task',
      priority: i.priority || 'medium',
      status: 'inbox',
      scope_id: targetScopeId,
      created_by_agent_id: agentId,
      metadata: i.parent_context
        ? { context_note: i.parent_context, agent_generated: !!agentId }
        : {},
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

  CREATE_BLUEPRINT: async (
    supabase: SupabaseClient,
    userId: string,
    payload: any,
    context?: any
  ) => {
    // 1. Валидация
    const validPayload = TOOL_SCHEMAS.CREATE_BLUEPRINT.parse(payload)

    // 2. Получение ID скоупа
    let targetScopeId = context?.scopeId
    if (!targetScopeId && context?.scope) {
      const { data } = await supabase
        .from('scopes')
        .select('id')
        .eq('slug', context.scope)
        .single()
      targetScopeId = data?.id
    }

    if (!targetScopeId)
      throw new Error('CREATE_BLUEPRINT requires a valid Scope ID context')

    // 3. Создание записи
    const { data, error } = await supabase
      .from('blueprints')
      .insert({
        user_id: userId,
        scope_id: targetScopeId,
        created_by_agent_id: context?.agentId || null,
        name: validPayload.title,
        description: validPayload.description,
        // Сохраняем структуру как есть, не создавая задач
        data_snapshot: {
          new_items: validPayload.new_items,
          include_ids: validPayload.include_ids || [],
          exclude_ids: validPayload.exclude_ids || [],
        },
        is_applied: false, // Это черновик
      })
      .select()
      .single()

    if (error) throw error
    return {
      message: 'Blueprint created successfully',
      blueprint_id: data.id,
      stats: `${validPayload.new_items.length} new items proposed`,
    }
  },
}
