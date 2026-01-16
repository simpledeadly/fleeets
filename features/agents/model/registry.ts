import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getEmbedding } from './embedding'
import { AgentTaskDomain } from './types'

const ItemSchema = z.object({
  content: z.string().min(1),
  type: z
    .enum(['task', 'note', 'resource', 'thought', 'objective', 'key_result'])
    .default('task'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  description: z.string().optional(),
  parent_context: z.string().optional(),
})

export interface ToolDefinition {
  id: string
  domain: AgentTaskDomain
  description: string
  schema: z.ZodType<any>
  handler: (
    supabase: SupabaseClient,
    userId: string,
    payload: any,
    context?: any
  ) => Promise<any>
  requiresConfirmation?: boolean
}

export const AGENT_TOOLS: Record<string, ToolDefinition> = {
  RAG_SEARCH: {
    id: 'RAG_SEARCH',
    domain: 'system',
    description: 'Поиск по базе знаний и прошлым задачам пользователя (RAG)',
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(5),
    }),
    handler: async (supabase, userId, payload, context) => {
      const queryVector = await getEmbedding(payload.query, userId)
      const targetScopeId = payload.global ? null : context?.scopeId
      const { data, error } = await supabase.rpc('match_items', {
        query_embedding: queryVector,
        match_threshold: 0.35,
        match_count: payload.limit || 10,
        user_id_input: userId,
        filter_scope_id: targetScopeId,
      })
      if (error) throw error
      return data
    },
  },

  FETCH_REPORT: {
    id: 'FETCH_REPORT',
    domain: 'system',
    description: 'Получить отчет за день или неделю',
    schema: z.object({
      type: z.enum(['daily', 'weekly']),
      date: z.string().optional(),
    }),
    handler: async (supabase, userId, payload) => {
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
  },

  CREATE_ITEMS: {
    id: 'CREATE_ITEMS',
    domain: 'database',
    description: 'Создать одну или несколько новых задач/заметок',
    requiresConfirmation: true,
    schema: z.union([
      z.array(ItemSchema),
      z.object({ items: z.array(ItemSchema) }),
    ]),
    handler: async (supabase, userId, payload, context) => {
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
  },

  UPDATE_ITEM: {
    id: 'UPDATE_ITEM',
    domain: 'database',
    description:
      'Обновить существующую задачу (изменить статус, описание и т.д.)',
    requiresConfirmation: true,
    schema: z.object({
      id: z.uuid(),
      content: z.string().optional(),
      description: z.string().optional(),
      status: z
        .enum(['inbox', 'planned', 'today', 'done', 'archived', 'deleted'])
        .optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
    handler: async (supabase, userId, payload) => {
      return await supabase
        .from('items')
        .update(payload)
        .eq('id', payload.id)
        .eq('user_id', userId)
    },
  },

  UPDATE_SCOPE_VIEW: {
    id: 'UPDATE_SCOPE_VIEW',
    domain: 'database',
    description: 'Изменить настройки отображения текущего проекта',
    schema: z.object({
      scopeId: z.string(),
      view: z.string(),
      config: z.any().optional(),
    }),
    handler: async (supabase, userId, payload) => {
      return await supabase
        .from('scopes')
        .update({
          view_type: payload.view,
          view_config: payload.config || {},
        })
        .eq('id', payload.scopeId)
    },
  },

  UPDATE_PROJECT_MANIFESTO: {
    id: 'UPDATE_PROJECT_MANIFESTO',
    domain: 'database',
    description: 'Обновить манифест (цели и правила) проекта',
    requiresConfirmation: true,
    schema: z.object({
      scopeId: z.string(),
      manifesto: z.string(),
    }),
    handler: async (supabase, userId, payload) => {
      return await supabase
        .from('scopes')
        .update({
          manifesto: payload.manifesto,
        })
        .eq('id', payload.scopeId)
    },
  },

  CREATE_BLUEPRINT: {
    id: 'CREATE_BLUEPRINT',
    domain: 'database',
    description: 'Создать чертеж (план) проекта с набором предложенных задач',
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      new_items: z.array(ItemSchema),
      include_ids: z.array(z.string()).optional(),
      exclude_ids: z.array(z.string()).optional(),
    }),
    handler: async (supabase, userId, payload, context) => {
      let targetScopeId = context?.scopeId
      if (!targetScopeId) throw new Error('Scope ID context required')

      const { data, error } = await supabase
        .from('blueprints')
        .insert({
          user_id: userId,
          scope_id: targetScopeId,
          created_by_agent_id: context?.agentId || null,
          name: payload.title,
          description: payload.description,
          data_snapshot: {
            new_items: payload.new_items,
            include_ids: payload.include_ids || [],
            exclude_ids: payload.exclude_ids || [],
          },
          is_applied: false,
        })
        .select()
        .single()

      if (error) throw error
      return {
        blueprint_id: data.id,
        stats: `${payload.new_items.length} items proposed`,
      }
    },
  },
}
