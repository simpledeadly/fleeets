import { SupabaseClient } from '@supabase/supabase-js'

export type ToolHandler = (
  supabase: SupabaseClient,
  userId: string,
  payload: any
) => Promise<any>

export interface ToolRegistry {
  database: Record<string, ToolHandler>
  system: Record<string, ToolHandler>
}

export const TOOL_REGISTRY: ToolRegistry = {
  database: {
    CREATE_ITEMS: async (supabase, userId, data) => {
      const items = Array.isArray(data) ? data : [data]
      return await supabase.from('items').insert(
        items.map((i: any) => ({
          ...i,
          user_id: userId,
          status: i.status || 'inbox',
          scope: i.scope || 'general',
        }))
      )
    },
    UPDATE_ITEM: async (supabase, userId, data) => {
      if (!data.id) throw new Error('ID required for UPDATE_ITEM')
      return await supabase
        .from('items')
        .update(data)
        .eq('id', data.id)
        .eq('user_id', userId)
    },
  },
  system: {
    RAG_SEARCH: async (_supabase, _userId, query) => {
      // Имитация поиска
      console.log('🔍 DRY RUN: RAG Search for:', query)
      return [{ content: 'Найденный контекст из базы данных' }]
    },
  },
}
