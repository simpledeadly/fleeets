// features/agents/model/contextGatherer.ts
import { SupabaseClient } from '@supabase/supabase-js'

export async function getProjectManifesto(
  supabase: SupabaseClient,
  scopeSlug: string
) {
  // Ищем проект по слагу или ID
  const { data } = await supabase
    .from('scopes')
    .select('manifesto, view_type')
    .eq('slug', scopeSlug) // или id
    .single()

  if (data) {
    return `PROJECT MANIFESTO: ${data.manifesto}\nCURRENT VIEW: ${data.view_type}`
  }
  return 'General Context'
}

export async function gatherContext(
  supabase: SupabaseClient,
  userId: string,
  agentId: string,
  context: any,
  perms: any
) {
  // Ищем scope_id. Если передан slug (текст), ищем ID. Если передан ID, используем его.
  let scopeId = context.scopeId

  if (!scopeId && context.scope) {
    const { data } = await supabase
      .from('scopes')
      .select('id')
      .eq('slug', context.scope)
      .single()
    scopeId = data?.id
  }

  const [profile, project] = await Promise.all([
    perms.user_manifesto
      ? supabase.from('profiles').select('manifesto').eq('id', userId).single()
      : { data: null },
    perms.project_manifesto
      ? fetchProjectContext(supabase, scopeId, context.itemId) // Передаем ID
      : Promise.resolve(''),
  ])

  return {
    userPrefs: profile.data?.manifesto || '',
    projectContext: project,
  }
}

async function fetchProjectContext(
  supabase: any,
  scopeId: string,
  itemId?: string
) {
  // 1. Сначала пробуем взять описание из самой задачи (если это вложенность)
  if (itemId) {
    const { data } = await supabase
      .from('items')
      .select('parent:parent_id(description)')
      .eq('id', itemId)
      .single()
    if (data?.parent?.description)
      return `PARENT_TASK_CONTEXT: ${data.parent.description}`
  }

  // 2. Если нет, берем Манифест СКОУПА
  if (scopeId) {
    const { data } = await supabase
      .from('scopes')
      .select('name, description, manifesto, view_type')
      .eq('id', scopeId)
      .single()
    if (data) {
      return `
        PROJECT NAME: ${data.name}
        PROJECT TYPE: ${data.view_type}
        DESCRIPTION: ${data.description || ''}
        MANIFESTO: ${data.manifesto || ''}
      `.trim()
    }
  }
  return 'General Context (No specific project found)'
}
