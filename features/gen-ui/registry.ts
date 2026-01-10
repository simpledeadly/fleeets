import { GenDailyReport } from './ui/GenDailyReport'
import { GenWeeklyReport } from './ui/GenWeeklyReport'

// 1. Список ключей
export const GEN_UI_KEYS = ['daily_report', 'weekly_report'] as const

// 2. Тип на основе ключей
export type GenUIToolType = (typeof GEN_UI_KEYS)[number]

export interface ToolDefinition {
  type: GenUIToolType
  description: string
  jsonSchema: string
  component: React.ComponentType<{ data: any }>
}

export const GEN_UI_REGISTRY: Record<GenUIToolType, ToolDefinition> = {
  daily_report: {
    type: 'daily_report',
    description:
      'Показать итоги/отчёт дня: созданные и завершенные задачи, время в фокусе.',
    jsonSchema: '{ "type": "daily_report", "data": { "date": "YYYY-MM-DD" } }',
    component: GenDailyReport,
  },
  weekly_report: {
    type: 'weekly_report',
    description:
      'Показать аналитический отчет за неделю: графики, фокус и прогресс.',
    jsonSchema: '{ "type": "weekly_report", "data": {} }',
    component: GenWeeklyReport,
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
