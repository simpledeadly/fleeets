'use server'

import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

// 1. ПОЛУЧЕНИЕ МАНИФЕСТА
export async function getManifesto() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('manifesto')
    .eq('id', user.id)
    .single()
  return profile?.manifesto
}

// 2. ОБНОВЛЕНИЕ МАНИФЕСТА
export async function updateManifesto(
  currentManifesto: any,
  userInput: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const systemPrompt = `
    ТЫ — AI-АНАЛИТИК. Твоя задача — извлечь из текста пользователя информацию и уложить её в СТРОГУЮ JSON-СХЕМУ.
    
    JSON-СХЕМА:
    {
      "roles": [{ "name": "string", "focus": "string (опционально)" }],
      "projects": [{ "name": "string", "roles": ["string"], "status": "string", "deadline": "YYYY-MM-DD", "goals": ["string"] }],
      "values": ["string"]
    }

    ПРАВИЛА:
    1. Проанализируй текст пользователя.
    2. Извлеки роли, проекты, цели, ценности.
    3. ЗАПОЛНИ JSON-СХЕМУ. Если данных нет — оставь пустой массив.
    4. Верни ТОЛЬКО валидный JSON.
  `

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ],
    model: 'meta-llama/llama-3-70b-instruct',
    response_format: { type: 'json_object' },
  })

  const extractedData = JSON.parse(
    completion.choices[0].message.content || '{}'
  )

  const newManifesto: any = JSON.parse(
    JSON.stringify(currentManifesto || { roles: [], projects: [], values: [] })
  )

  // 1. Роли
  if (extractedData.roles && Array.isArray(extractedData.roles)) {
    const rolesMap = new Map(
      (newManifesto.roles || []).map((r: any) => [r.name, r])
    )
    extractedData.roles.forEach((newRole: any) => {
      const roleName = typeof newRole === 'string' ? newRole : newRole?.name
      if (!roleName) return

      const roleObject =
        typeof newRole === 'string' ? { name: roleName } : newRole

      rolesMap.set(roleName, {
        ...(rolesMap.get(roleName) || {}),
        ...roleObject,
      })
    })
    newManifesto.roles = Array.from(rolesMap.values())
  }

  // 2. Проекты
  if (extractedData.projects && Array.isArray(extractedData.projects)) {
    const projectsMap = new Map(
      (newManifesto.projects || []).map((p: any) => [p.name, p])
    )
    extractedData.projects.forEach((newProject: any) => {
      if (newProject && typeof newProject === 'object' && newProject.name) {
        projectsMap.set(newProject.name, {
          ...(projectsMap.get(newProject.name) || {}),
          ...newProject,
        })
      }
    })
    newManifesto.projects = Array.from(projectsMap.values())
  }

  // 3. Ценности
  if (extractedData.values && Array.isArray(extractedData.values)) {
    newManifesto.values = [
      ...new Set([...(newManifesto.values || []), ...extractedData.values]),
    ]
  }

  // Сохраняем в базу
  await supabase
    .from('profiles')
    .update({ manifesto: newManifesto })
    .eq('id', user.id)

  return newManifesto
}

// 3. ГЕНЕРАТОР ВОПРОСОВ
export async function getManifestoSuggestion(currentManifesto: any) {
  const prompt = `
    Ты — коуч. Ты помогаешь пользователю создать свой "Манифест".
    Посмотри на текущее состояние его манифеста и задай СЛЕДУЮЩИЙ логичный вопрос,
    чтобы дополнить картину. Задавай по одному вопросу за раз.
    Если манифест пуст, начни с ролей. Если есть роли, спроси про цели. Если есть цели, спроси про ценности.
    Будь краток и дружелюбен.

    ТЕКУЩИЙ МАНИФЕСТ:
    ${JSON.stringify(currentManifesto, null, 2)}
  `

  const completion = await openai.chat.completions.create({
    messages: [{ role: 'system', content: prompt }],
    model: 'meta-llama/llama-3-8b-instruct', // 8b для вопросов хватит
  })

  return completion.choices[0].message.content || 'Что еще для тебя важно?'
}
