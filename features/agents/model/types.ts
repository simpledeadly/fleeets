export type AgentIntent =
  | 'UPDATE_ITEM' // Изменить текущую задачу
  | 'CREATE_CHILDREN' // Создать подзадачи (декомпозиция)
  | 'SUMMARIZE' // Просто выдать текст (для чата или рекапа)
  | 'LINK_ITEMS' // Создать связи между существующими задачами

export interface AgentResponse {
  intent: AgentIntent
  content: string // Основной текст ответа
  data?: any // Массив задач, обновленные поля и т.д.
  log_message: string // Что записать в execution_log
}
