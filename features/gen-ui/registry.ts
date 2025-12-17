import { GenDecompose } from './ui/GenDecompose'

// 1. Список ключей (для рантайм проверки)
export const GEN_UI_KEYS = ['decomposition'] as const

// 2. Тип на основе ключей
export type GenUIToolType = (typeof GEN_UI_KEYS)[number]

export interface ToolDefinition {
  type: GenUIToolType
  description: string
  jsonSchema: string
  component: React.ComponentType<any>
}

export const GEN_UI_REGISTRY: Record<GenUIToolType, ToolDefinition> = {
  decomposition: {
    type: 'decomposition',
    description: 'Разбить задачу на подзадачи, составить план действий.',
    jsonSchema: '{ "type": "decomposition", "data": ["Шаг 1", "Шаг 2"] }',
    component: GenDecompose,
  },
}

export function getSystemPromptTools() {
  return Object.values(GEN_UI_REGISTRY)
    .map(
      (tool) => `
        - ЦЕЛЬ: ${tool.description}
        - FORMAT JSON: ${tool.jsonSchema}
      `
    )
    .join('\n')
}

export function isGenUITool(type: string): type is GenUIToolType {
  return GEN_UI_KEYS.includes(type as GenUIToolType)
}
