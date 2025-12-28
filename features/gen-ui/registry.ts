import { GenDecompose } from './ui/GenDecompose'
import { GenDailyReport } from './ui/GenDailyReport'

// 1. Список ключей (для рантайм проверки)
export const GEN_UI_KEYS = ['decomposition', 'daily_report'] as const

// 2. Тип на основе ключей
export type GenUIToolType = (typeof GEN_UI_KEYS)[number]

export interface ToolDefinition {
  type: GenUIToolType
  description: string
  jsonSchema: string
  component: React.ComponentType<{ data: any }>
}

export const GEN_UI_REGISTRY: Record<GenUIToolType, ToolDefinition> = {
  decomposition: {
    type: 'decomposition',
    description: 'Разбить задачу на подзадачи, составить план действий.',
    jsonSchema: '{ "type": "decomposition", "data": ["Шаг 1", "Шаг 2"] }',
    component: GenDecompose,
  },
  daily_report: {
    type: 'daily_report',
    description:
      'Показать итоги/отчёт дня: созданные и завершенные задачи, время в фокусе.',
    jsonSchema: '{ "type": "daily_report", "data": { "date": "YYYY-MM-DD" } }',
    component: GenDailyReport,
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
