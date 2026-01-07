import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

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
