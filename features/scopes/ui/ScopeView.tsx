'use client'

import { useScopeStore } from '@/features/scopes/model/store'
import { useStore } from '@/lib/store'
// import { KanbanView } from './KanbanView' // Твой текущий вид (если есть)
// import { ListView } from './ListView' // Твой текущий вид
import { RoadmapView } from '../../views/project/RoadmapView' // Новый компонент

export function ScopeView() {
  const { activeScope, isLoading } = useScopeStore()
  const { items } = useStore()

  if (isLoading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Загрузка проекта...
      </div>
    )
  if (!activeScope)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Выберите проект
      </div>
    )

  // Дефолтный вид - список, если ничего не задано
  const viewType = activeScope.view_type || 'list'

  console.log(`[ProjectView] Rendering ${viewType} for ${activeScope.name}`)

  // Маппинг компонентов
  switch (viewType) {
    case 'roadmap':
      return <RoadmapView scope={activeScope} items={items} />
    case 'kanban':
      return <h1>HI ITS KANBAN-COMBINE</h1>
      // return <KanbanView items={items} /> // Если у тебя есть такой компонент
    case 'graph':
      return (
        <div className="p-10 border border-dashed border-border rounded-xl flex justify-center items-center">
          Граф пока в разработке
        </div>
      )
    case 'list':
    default:
      // Возвращаем то, что у тебя сейчас на главной (список задач)
      // return <ListView items={items} />
      return <h1>HI ITS DEFAULT</h1>
  }
}
