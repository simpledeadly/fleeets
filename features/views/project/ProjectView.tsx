'use client'

import { memo } from 'react' // <--- MEMO
import { useScopeStore } from '@/features/scopes/model/store'
import { useStore } from '@/lib/store'
import { RoadmapView } from '@/features/views/project/RoadmapView'

// Выносим во вспомогательный компонент для чистоты мемоизации
const ViewRenderer = memo(({ viewType, scope, items }: any) => {
  console.log(`[ViewRenderer] Rendering ${viewType}`)

  switch (viewType) {
    case 'roadmap':
      return <RoadmapView scope={scope} items={items} />
    case 'kanban':
      return <div className="p-10 text-center">Канбан (Скоро)</div>
    case 'list':
    default:
      return (
        <div>
          <h1>ITS DEFAULT</h1>
        </div>
      )
  }
})

ViewRenderer.displayName = 'ViewRenderer'

export function ProjectView() {
  const { activeScope, isLoading, isSwitching } = useScopeStore()
  const { items } = useStore()

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Загрузка...
      </div>
    )
  if (!activeScope)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Выберите проект
      </div>
    )

  if (isSwitching) {
    return <div className="p-10 animate-pulse">Загрузка контекста...</div>
  }

  return (
    <ViewRenderer
      viewType={activeScope.view_type || 'list'}
      scope={activeScope}
      items={items}
    />
  )
}
