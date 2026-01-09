'use server'

import { createClient } from '@/lib/supabase/server'
// import { revalidatePath } from 'next/cache'
// Импортируем тип Scope, если он у тебя в store.ts, либо определяем здесь
import { Scope } from './store'

export async function getScopes() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Возвращаем пустую структуру, а не массив, если нет юзера
  if (!user) return { scopes: [] as Scope[], activeScopeId: null }

  const { data: scopes } = await supabase
    .from('scopes')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_scope_id')
    .eq('id', user.id)
    .single()

  return {
    scopes: (scopes || []) as Scope[],
    activeScopeId: profile?.active_scope_id || null,
  }
}

export async function switchScopeAction(scopeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update({ active_scope_id: scopeId })
    .eq('id', user.id)

  // revalidatePath('/')
}
