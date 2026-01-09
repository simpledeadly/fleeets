'use client'

import { Item } from '@/lib/store'
import { Scope } from '@/features/scopes/model/store'
import { Plus } from 'lucide-react'

export function RoadmapView({ scope, items }: { scope: Scope; items: Item[] }) {
  // Фильтруем только задачи верхнего уровня (Фазы/Эпики)
  // Предполагаем, что у Фаз нет родителя или они помечены тегом #phase
  const phases = items.filter((i) => !i.parent_id && i.status !== 'done')

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{scope.name}</h1>
          <p className="text-sm text-muted-foreground">
            Стратегическая карта (MVP)
          </p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
          <Plus size={16} /> Новая фаза
        </button>
      </div>

      {/* Сетка фаз */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.length === 0 ? (
          <div className="col-span-full py-20 text-center border border-dashed border-border rounded-xl text-muted-foreground">
            Проект пуст. Нажми «Магия», чтобы сгенерировать план.
          </div>
        ) : (
          phases.map((phase) => (
            <div
              key={phase.id}
              className="p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  Phase
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40`}
                >
                  {phase.status}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                {phase.content}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                {phase.description || 'Нет описания...'}
              </p>

              {/* Прогресс бар (фейковый пока) */}
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-1/3" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
