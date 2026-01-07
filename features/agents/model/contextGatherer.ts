// features/agents/model/contextGatherer.ts
import { SupabaseClient } from '@supabase/supabase-js'

export async function gatherContext(
  supabase: SupabaseClient,
  userId: string,
  agentId: string,
  context: any,
  perms: any
) {
  const [profile, project] = await Promise.all([
    perms.user_manifesto
      ? supabase.from('profiles').select('manifesto').eq('id', userId).single()
      : { data: null },
    perms.project_manifesto
      ? fetchProjectDesc(supabase, context.scope, context.itemId)
      : Promise.resolve(''),
  ])

  return {
    userPrefs: profile.data?.manifesto || '',
    projectContext: project,
  }
}

async function fetchProjectDesc(supabase: any, scope: string, itemId?: string) {
  if (itemId) {
    const { data } = await supabase
      .from('items')
      .select('parent:parent_id(description)')
      .eq('id', itemId)
      .single()
    if (data?.parent?.description) return data.parent.description
  }
  return `Scope: ${scope}`
}
