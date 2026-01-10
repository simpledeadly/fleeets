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

export async function createScope(name: string, viewType = 'roadmap') {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Auth required')

  // Генерируем slug
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  const { data, error } = await supabase
    .from('scopes')
    .insert({
      user_id: user.id,
      name,
      slug,
      view_type: viewType,
      manifesto: 'Цель проекта: ...', // Дефолтный манифест
      theme_config: { accent: '#3B82F6', mode: 'system' },
    })
    .select()
    .single()

  if (error) throw error
  // revalidatePath('/')
  return data
}

// UPDATE
export async function updateScope(scopeId: string, updates: any) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scopes')
    .update(updates)
    .eq('id', scopeId)
    .select()
    .single()

  if (error) throw error
  // revalidatePath('/')
  return data
}

// DELETE
export async function deleteScope(scopeId: string) {
  const supabase = await createClient()

  // Каскадное удаление должно быть настроено в БД,
  // иначе сначала удаляем items, blueprints, потом scope
  const { error } = await supabase.from('scopes').delete().eq('id', scopeId)

  if (error) throw error

  // Сбрасываем активный скоуп в профиле
  await supabase
    .from('profiles')
    .update({ active_scope_id: null })
    .eq('active_scope_id', scopeId)

  // revalidatePath('/')
}
