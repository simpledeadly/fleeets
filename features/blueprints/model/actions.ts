'use server'

import { createClient } from '@/lib/supabase/server'
// import { revalidatePath } from 'next/cache'

export async function getLatestBlueprint(scopeId: string) {
  const supabase = await createClient()

  // Ищем последний НЕ примененный чертеж
  const { data } = await supabase
    .from('blueprints')
    .select('*')
    .eq('scope_id', scopeId)
    .eq('is_applied', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

export async function getActiveBlueprint(scopeId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blueprints')
    .select('id, name, created_at, description, is_applied')
    .eq('scope_id', scopeId)
    .eq('is_applied', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

export async function applyBlueprint(blueprintId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Auth required')

  const { data: bp } = await supabase
    .from('blueprints')
    .select('*')
    .eq('id', blueprintId)
    .single()
  if (!bp) throw new Error('Blueprint not found')

  const snapshot = bp.data_snapshot as any
  const newItems = snapshot.new_items || []

  const agentId = bp.created_by_agent_id

  // --- ЛОГИКА СШИВАНИЯ (Relational Linking) ---

  // 1. Разделяем на Фазы (Objectives) и Задачи (Tasks)
  const phases = newItems.filter((i: any) => i.type === 'objective')
  const tasks = newItems.filter((i: any) => i.type !== 'objective')

  // 2. Создаем Фазы и получаем их ID
  const phaseMap = new Map<string, string>() // Название -> UUID

  if (phases.length > 0) {
    const { data: createdPhases, error: phaseErr } = await supabase
      .from('items')
      .insert(
        phases.map((p: any) => ({
          user_id: user.id,
          scope_id: bp.scope_id,
          content: p.content,
          type: 'objective',
          status: 'planned',
          in_roadmap: true,
          created_by_agent_id: agentId,
          metadata: { blueprint_id: bp.id, agent_generated: true },
        }))
      )
      .select('id, content') // Нам нужны ID и названия

    if (phaseErr) throw phaseErr

    // Запоминаем ID созданных фаз
    createdPhases.forEach((p) => {
      // Ключ мапы - это контент (например, "Фаза 1: Инфраструктура")
      // Можно упростить ключи для надежности, но пока берем полное совпадение
      phaseMap.set(p.content.trim(), p.id)
      // Хак: сохраним и просто по началу строки, если агент написал "Фаза 1"
      const shortKey = p.content.split(':')[0].trim()
      phaseMap.set(shortKey, p.id)
    })
  }

  // Создаем карту связей из relations для быстрых лукапов
  const relationsMap = new Map<string, string>() // FakeID -> ParentName
  if (snapshot.relations) {
    snapshot.relations.forEach((r: any) => {
      relationsMap.set(r.item_id, r.parent_context)
    })
  }

  // 3. Создаем Задачи с привязкой к Фазам
  if (tasks.length > 0) {
    const tasksToInsert = tasks.map((t: any) => {
      // Ищем родителя
      // let parentId = null
      // if (t.parent_context) {
      //   // Пробуем найти UUID по названию фазы
      //   parentId = phaseMap.get(t.parent_context.trim()) || null
      // }
      let parentName = t.parent_context

      // 2. Если нет, ищем в карте relations по фейковому ID
      if (!parentName && t.id) {
        parentName = relationsMap.get(t.id)
      }

      // 3. Ищем UUID родителя
      let parentId = null
      if (parentName) {
        parentId = phaseMap.get(parentName.trim()) || null
      }

      return {
        user_id: user.id,
        scope_id: bp.scope_id,
        content: t.content,
        type: 'task',
        status: 'planned',
        in_roadmap: true,
        parent_id: parentId,
        priority: t.priority || 'medium',
        created_by_agent_id: agentId,
        metadata: { blueprint_id: bp.id, agent_generated: true },
      }
    })

    const { error: taskErr } = await supabase
      .from('items')
      .insert(tasksToInsert)
    if (taskErr) throw taskErr
  }

  if (snapshot.relations && snapshot.relations.length > 0) {
    // Группируем обновления, чтобы не делать 100 запросов
    // Но для MVP проще пройтись циклом (Supabase выдержит)

    for (const rel of snapshot.relations) {
      // Ищем ID фазы в карте созданных (или это может быть существующая фаза, но пока ищем в новых)
      // Если агент ссылается на фазу по имени "Фаза 1"
      const parentId = phaseMap.get(rel.parent_context.trim())

      if (parentId) {
        await supabase
          .from('items')
          .update({ parent_id: parentId, in_roadmap: true }) // Сразу включаем в роадмап
          .eq('id', rel.item_id)
      }
    }
  }

  // 4. Обновляем существующие (include/exclude)
  if (snapshot.include_ids?.length) {
    await supabase
      .from('items')
      .update({ in_roadmap: true })
      .in('id', snapshot.include_ids)
  }
  if (snapshot.exclude_ids?.length) {
    await supabase
      .from('items')
      .update({ in_roadmap: false })
      .in('id', snapshot.exclude_ids)
  }

  // 5. Закрываем чертеж
  // 1. Снимаем флаг is_applied со ВСЕХ чертежей этого скоупа
  await supabase
    .from('blueprints')
    .update({ is_applied: false })
    .eq('scope_id', bp.scope_id)

  // 2. Ставим флаг is_active ТОЛЬКО текущему
  await supabase
    .from('blueprints')
    .update({ is_applied: true })
    .eq('id', blueprintId)

  // revalidatePath('/')
  return { success: true }
}

export async function discardBlueprint(blueprintId: string) {
  const supabase = await createClient()

  // Просто удаляем черновик
  const { error } = await supabase
    .from('blueprints')
    .delete()
    .eq('id', blueprintId)

  if (error) throw error
  // revalidatePath('/')
  return { success: true }
}

export async function getBlueprintHistory(scopeId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('blueprints')
    .select('id, name, created_at, is_applied, description, data_snapshot')
    .eq('scope_id', scopeId)
    .order('created_at', { ascending: false })

  return data || []
}

// Функция отката (восстановления)
export async function restoreBlueprint(blueprintId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Auth required')

  // 1. Берем старый чертеж
  const { data: oldBp } = await supabase
    .from('blueprints')
    .select('*')
    .eq('id', blueprintId)
    .single()

  if (!oldBp) throw new Error('Blueprint not found')

  // 2. Создаем его КЛОН как новый активный черновик
  const { error } = await supabase.from('blueprints').insert({
    user_id: user.id,
    scope_id: oldBp.scope_id,
    name: `Restored: ${oldBp.name}`,
    description: `Восстановлено из версии от ${new Date(
      oldBp.created_at
    ).toLocaleDateString()}`,
    data_snapshot: oldBp.data_snapshot,
    is_active: false, // Делаем его черновиком, чтобы появилось окно Review
  })

  if (error) throw error
  // revalidatePath('/')
  return { success: true }
}
