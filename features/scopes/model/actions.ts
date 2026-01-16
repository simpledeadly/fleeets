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

// Helper to generate pastel colors
function generatePastelTheme() {
  const hue = Math.floor(Math.random() * 360)
  // Saturation 60-90% for vibrancy but not neon
  const saturation = 70 + Math.random() * 20
  // Lightness 75-85% for pastel look
  const lightness = 80 + Math.random() * 10

  // Convert HSL to Hex for storage
  const h = hue
  const s = saturation / 100
  const l = lightness / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
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

  const accentColor = generatePastelTheme()

  const { data, error } = await supabase
    .from('scopes')
    .insert({
      user_id: user.id,
      name,
      slug,
      view_type: viewType,
      manifesto: 'Цель проекта: ...', // Дефолтный манифест
      theme_config: { accent: accentColor, mode: 'system' },
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
