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

  const moveItemsAllowed = perms.tools?.some((p: string) =>
    p.toUpperCase().includes('MOVE_ITEMS')
  )

  const [profile, project, { data: allScopes }] = await Promise.all([
    perms.user_manifesto
      ? supabase.from('profiles').select('manifesto').eq('id', userId).single()
      : { data: null },
    perms.project_manifesto
      ? fetchProjectContext(supabase, scopeId, context.itemId) // Передаем ID
      : Promise.resolve(''),
    moveItemsAllowed
      ? supabase
          .from('scopes')
          .select('id, name, slug')
          .eq('user_id', userId)
          .order('name')
      : Promise.resolve({ data: [] }),
  ])

  let selectedItemsContext = ''

  if (context.itemIds && context.itemIds.length > 0) {
    const fields = context.includeFields || [
      'content',
      'description',
      'is_quick',
      'priority',
      'status',
      'type',
    ]
    const selectQuery = ['id', ...fields].join(', ')

    const { data: items } = await supabase
      .from('items')
      .select(selectQuery)
      .in('id', context.itemIds)

    if (items && items.length > 0) {
      selectedItemsContext = items
        .map((i: any) => {
          let str = `[ITEM id=${i.id}${i.type ? ` type=${i.type}` : ''}${
            i.status ? ` status=${i.status}` : ''
          }${i.is_quick ? ` is_quick=${i.is_quick}` : ''}${
            i.priority ? ` priority=${i.priority}` : ''
          }]`
          if (i.content) str += `\nCONTENT: ${i.content}`
          if (i.description) str += `\nDESC: ${i.description}`
          return str
        })
        .join('\n---\n')

      selectedItemsContext = `\n\nUSER SELECTED THESE ITEMS:\n${selectedItemsContext}`
    }
  }

  const availableProjectsContext =
    moveItemsAllowed && allScopes && allScopes.length > 0
      ? `\n\nAVAILABLE PROJECTS (SCOPES):\n${allScopes
          .map((s) => `- ${s.name} (ID: ${s.id}, Slug: ${s.slug})`)
          .join('\n')}`
      : ''

  return {
    userPrefs: profile.data?.manifesto || '',
    projectContext: project + availableProjectsContext,
    selectedItems: selectedItemsContext,
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
