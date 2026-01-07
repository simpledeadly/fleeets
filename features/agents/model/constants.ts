export const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
}

export const LEGACY_INTENT_MAP: Record<string, string> = {
  СОЗДАТЬ: 'CREATE_ITEMS',
  CREATE_CHILDREN: 'CREATE_ITEMS',
  UPDATE_ITEM: 'UPDATE_ITEM',
  ДЕКОМПОЗИЦИЯ: 'CREATE_ITEMS',
}
