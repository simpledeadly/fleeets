'use server'

import { createClient } from '@/lib/supabase/server'
import { createAiClient } from '@/lib/ai/client'

// --- HELPER: Cosine Similarity ---
function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// --- CONSTANTS ---
const ROOT_SIMILARITY_THRESHOLD = 0.23
const SUB_SIMILARITY_THRESHOLD = 0.28

// --- TYPES ---
export type TaxonomyRoot = {
  name: string
  keywords: string[]
  description: string
  subs: { name: string; description: string }[]
}

/**
 * PHASE 1: DISCOVERY
 * Scans a sample of items to "Guess" the project structure.
 * Returns a Draft Taxonomy for the user to review.
 */
export async function discoverTaxonomy(hint: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Fetch Items for Sampling (INCLUDE RAW CONTENT for context)
  const { data: items, error } = await supabase
    .from('items')
    .select('content, raw_content, description')
    .eq('user_id', user.id)
    .in('status', ['inbox', 'planned', 'today', 'archived'])
    .neq('status', 'deleted')
    .limit(1000)

  if (error || !items || items.length === 0) return { error: 'No items found.' }

  // 2. Prepare Sample (Shuffle & Slice)
  const sample = items
    .sort(() => 0.5 - Math.random())
    .slice(0, 100)
    .map(
      (i) =>
        `${i.content} ${
          i.raw_content ? `(Context: ${i.raw_content.slice(0, 100)}...)` : ''
        }`
    )

  const groq = createAiClient({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    userId: user.id,
    action: 'clustering',
  })

  // 3. AI Prompts (Russian Persona)
  const discoveryPrompt = `
    Ты — Профессиональный Архитектор Знаний.
    
    КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ: "${hint}"
 
    ПРИМЕРЫ ЗАДАЧ (SAMPLE):
    ${sample.join('\n- ')}
 
    ТВОЯ ЦЕЛЬ:
    Найти в этом хаосе Структуру Проектов.
    Особое внимание удели Именам Собственным (Entities) — названиям стартапов, компаний, людей.
    
    ЗАДАЧА:
    1. Идентифицируй 3-6 ГЛАВНЫХ ПРОЕКТОВ (Roots).
       - Если видишь задачи про "Fleeets" -> создай проект "Fleeets".
       - Если видишь задачи про дом/семью -> создай проект "Личное".
       - Обязательно создай проект "Inbox" (Входящие).
       - **KEYWORDS**: Список слов-маркеров (названия, синонимы), однозначно указывающих на этот проект.
       - **DESCRIPTION**: Твое предположение, что это за проект (минимум 2 предложения).

    2. Для каждого Корня, предложи 2-4 ПОДПРОЕКТА (Subs).
       - Опиши их суть для будущей классификации.

    ОТВЕТ (JSON):
    {
      "roots": [
        {
          "name": "Название",
          "keywords": ["ключ1", "ключ2"],
          "description": "Описание...",
          "subs": [ { "name": "Подпроект", "description": "Описание..." } ]
        }
      ],
      "thought_process": "Я нашел..."
    }
  `

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Ты — JSON генератор. Отвечай валидным JSON на русском.',
        },
        { role: 'user', content: discoveryPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return {
      success: true,
      roots: result.roots,
      thoughtProcess: result.thought_process,
    }
  } catch (e) {
    console.error('Discovery Failed:', e)
    return { error: 'Failed to discover taxonomy.' }
  }
}

/**
 * PHASE 2: SORTING
 * Takes the *User-Approved* Taxonomy, generates embeddings, and sorts items.
 * Deterministic & Strict.
 */
export async function sortItemsByTaxonomy(taxonomyRoots: TaxonomyRoot[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Fetch ALL Items with Vectors AND Raw Content
  const { data: items, error } = await supabase
    .from('items')
    .select('id, content, raw_content, description, embedding, ai_tags')
    .eq('user_id', user.id)
    .not('embedding', 'is', null)
    .in('status', ['inbox', 'planned', 'today', 'archived'])
    .neq('status', 'deleted')

  if (error || !items) return { error: 'Items fetch failed.' }

  const parsedItems = items
    .map((item) => {
      let e = item.embedding
      if (typeof e === 'string') {
        try {
          e = JSON.parse(e)
        } catch {
          e = []
        }
      }
      return { ...item, embedding: e as number[] }
    })
    .filter((i) => i.embedding.length > 0)

  // 2. Generate Anchors for the APPROVED Taxonomy
  const openai = createAiClient({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    userId: user.id,
    action: 'clustering',
  })

  const rootAnchors: Record<string, number[]> = {}
  const subAnchors: Record<string, Record<string, number[]>> = {}

  try {
    for (const root of taxonomyRoots) {
      if (root.name === 'Inbox') continue

      const rootResp = await openai.embeddings.create({
        model: 'openai/text-embedding-3-small',
        input: root.description,
      })
      rootAnchors[root.name] = rootResp.data[0].embedding
      subAnchors[root.name] = {}

      if (root.subs) {
        for (const sub of root.subs) {
          const subResp = await openai.embeddings.create({
            model: 'openai/text-embedding-3-small',
            input: sub.description,
          })
          subAnchors[root.name][sub.name] = subResp.data[0].embedding
        }
      }
    }
  } catch (e) {
    console.error('Embedding Generation Failed', e)
    return { error: 'Failed to generate semantic anchors.' }
  }

  // 3. CLASSIFICATION LOOP
  const structureMap: Record<string, typeof parsedItems> = {}
  structureMap['Inbox/Unsorted'] = []

  parsedItems.forEach((item) => {
    const fullText = `${item.content} ${item.raw_content || ''} ${
      item.description || ''
    }`.toLowerCase()

    // --- Step A: Root Assignment ---
    let assignedRootKey = 'Inbox'
    let rootMethod = 'fallback'

    // 1. Keyword Guardrails
    for (const root of taxonomyRoots) {
      if (root.name === 'Inbox') continue
      // Check keywords in FULL text
      if (root.keywords?.some((k) => fullText.includes(k.toLowerCase()))) {
        assignedRootKey = root.name
        rootMethod = 'keyword'
        break
      }
    }

    // 2. Vector Search (if no keyword)
    if (rootMethod !== 'keyword') {
      let bestScore = -1
      let bestRoot = 'Inbox'

      for (const root of taxonomyRoots) {
        if (root.name === 'Inbox') continue
        const anchor = rootAnchors[root.name]
        if (!anchor) continue

        const score = cosineSimilarity(item.embedding, anchor)
        if (score > bestScore) {
          bestScore = score
          bestRoot = root.name
        }
      }

      if (bestScore >= ROOT_SIMILARITY_THRESHOLD) {
        assignedRootKey = bestRoot
        rootMethod = 'vector'
      }
    }

    if (assignedRootKey === 'Inbox') {
      structureMap['Inbox/Unsorted'].push(item)
      return
    }

    // --- Step B: Sub Assignment (Refinement) ---
    const rootObj = taxonomyRoots.find((r) => r.name === assignedRootKey)
    let assignedSubKey = 'General'

    if (rootObj && rootObj.subs && subAnchors[assignedRootKey]) {
      let bestSubScore = -1
      let bestSub = 'General'
      const mySubs = subAnchors[assignedRootKey]

      for (const sub of rootObj.subs) {
        const anchor = mySubs[sub.name]
        if (!anchor) continue

        const score = cosineSimilarity(item.embedding, anchor)
        if (score > bestSubScore) {
          bestSubScore = score
          bestSub = sub.name
        }
      }

      if (bestSubScore >= SUB_SIMILARITY_THRESHOLD) {
        assignedSubKey = bestSub
      }
    }

    const fullPath = `${assignedRootKey}/${assignedSubKey}`
    if (!structureMap[fullPath]) structureMap[fullPath] = []
    structureMap[fullPath].push(item)
  })

  // Format Result
  const finalStructure = Object.entries(structureMap)
    .map(([group, items]) => ({
      group,
      items: items.map((i) => i),
    }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.group.localeCompare(b.group))

  return {
    success: true,
    structure: finalStructure,
    debugTaxonomy: taxonomyRoots,
  }
}

/**
 * Action to APPLY the proposed structure to DB
 */
export async function applyArchitectStructure(
  structure: { group: string; items: { id: string }[] }[]
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  for (const group of structure) {
    const tagName = `group:${group.group}`
    const itemIds = group.items.map((i) => i.id)

    const { data: currentItems } = await supabase
      .from('items')
      .select('id, ai_tags')
      .in('id', itemIds)

    if (!currentItems) continue

    const updates = currentItems.map((item) => ({
      id: item.id,
      user_id: user.id,
      ai_tags: Array.from(new Set([...(item.ai_tags || []), tagName])),
    }))

    const { error } = await supabase.from('items').upsert(updates)
    if (error) console.error(`Failed to apply group ${tagName}`, error)
  }

  return { success: true }
}
