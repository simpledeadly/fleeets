// features/agents/model/handlers.ts
import { SupabaseClient } from '@supabase/supabase-js'

export const IntentHandlers = {
  CREATE_CHILDREN: async (supabase: SupabaseClient, item: any, data: any) => {
    const tasks = Array.isArray(data) ? data : data.tasks || []
    if (tasks.length === 0) return

    const { error } = await supabase.from('items').insert(
      tasks.map((t: any) => ({
        content: t.content,
        user_id: item.user_id,
        parent_id: item.id,
        scope: item.scope,
        type: 'task',
        status: 'inbox',
        priority: t.priority || 'medium',
      }))
    )

    await supabase
      .from('items')
      .update({
        execution_log: `${
          item.execution_log || ''
        }\n[${new Date().toISOString()}] Агент создал ${
          tasks.length
        } подзадач.`,
      })
      .eq('id', item.id)

    if (error) throw error
  },

  // УНИВЕРСАЛЬНЫЙ ХЕНДЛЕР (для UPDATE_ITEM, ДИЗАЙН и прочих)
  UPDATE_ITEM: async (supabase: SupabaseClient, item: any, data: any) => {
    const content =
      typeof data === 'string' ? data : data.content || JSON.stringify(data)
    if (!content) return

    return await supabase
      .from('items')
      .update({
        description: content,
        execution_log: `${
          item.execution_log || ''
        }\n[${new Date().toISOString()}] AI: Информация обновлена.`,
      })
      .eq('id', item.id)
  },
}
