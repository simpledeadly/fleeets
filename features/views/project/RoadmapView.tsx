'use client'

import { useEffect, useMemo, useState } from 'react'
import { Item, useStore } from '@/lib/store'
import { Scope } from '@/features/scopes/model/store'
import { Plus, Loader2, Box, ArrowLeft, RotateCcw } from 'lucide-react'
import { useAgent, useSystemAgent } from '@/features/agents' // Твой хук
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { fetchActiveItems } from '@/lib/data'
import {
  BlueprintHistory,
  BlueprintReview,
  getLatestBlueprint,
  getActiveBlueprint,
  restoreBlueprint,
} from '@/features/blueprints'

export function RoadmapView({ scope, items }: { scope: Scope; items: Item[] }) {
  const [goal, setGoal] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeBlueprint, setActiveBlueprint] = useState<any>(null)
  const [pendingBlueprint, setPendingBlueprint] = useState<any>(null)
  const [selectedBlueprint, setSelectedBlueprint] = useState<any>(null)

  const architectId = useSystemAgent('architect')
  const { runAgent } = useAgent()
  const { setItems } = useStore()

  // 3. Вычисление задач для отображения (Машина времени)
  const displayedItems = useMemo(() => {
    // А. Режим Review (Черновик) - показываем заглушку, так как там свой компонент
    if (selectedBlueprint && !selectedBlueprint.is_applied) return []

    // Б. Режим Preview (История)
    if (selectedBlueprint && selectedBlueprint.is_applied) {
      const snapshot = selectedBlueprint.data_snapshot
      // Собираем все ID, которые были в том плане (include + new)
      // Примечание: new_items в снапшоте еще не имели ID, но после apply они стали items.
      // Для простоты истории мы берем items, которые сейчас есть в базе и были включены в тот план.
      // (Чтобы сделать "идеальный" слепок, нужно хранить полный дамп в snapshot, но пока фильтруем по include_ids)
      const idsToShow = new Set([
        ...(snapshot.include_ids || []),
        // Тут сложнее с new_items, так как их ID мы узнали только после вставки.
        // Для MVP истории: показываем те, что были явно включены.
      ])
      // В реальном проекте лучше хранить final_items_ids в blueprints после apply

      // Хак для MVP: Если это активный план - показываем in_roadmap.
      // Если старый - показываем items.filter(id in include_ids).
      return items.filter((i) => idsToShow.has(i.id))
    }

    // В. Режим Live (По умолчанию)
    // Показываем всё, что in_roadmap. Если плана нет - показываем всё (или ничего)
    const hasRoadmap = items.some((i) => i.in_roadmap)
    if (!hasRoadmap) return items.filter((i) => i.status !== 'done') // Показать инбокс, если плана нет

    return items.filter((i) => i.in_roadmap)
  }, [items, selectedBlueprint])

  // Группировка
  const objectives = displayedItems
    .filter((i) => i.type === 'objective')
    .sort((a, b) =>
      a.content.localeCompare(b.content, undefined, { numeric: true })
    )

  const getChildTasks = (parentId: string) =>
    displayedItems.filter((i) => i.parent_id === parentId)

  const orphans = items
    .filter((i) => i.type === 'task' && !i.parent_id && i.status !== 'done')
    .slice(0, 10)

  useEffect(() => {
    const init = async () => {
      const active = await getActiveBlueprint(scope.id)
      setActiveBlueprint(active)

      const pending = await getLatestBlueprint(scope.id)
      if (pending) setSelectedBlueprint(pending) // Если есть черновик - сразу показываем
    }
    init()
  }, [scope.id])

  const handleHistorySelect = (bp: any) => {
    if (bp.id === activeBlueprint?.id) {
      setSelectedBlueprint(null) // Вернуться в Live
    } else {
      setSelectedBlueprint(bp) // Включить режим просмотра/ревью
    }
  }

  const handleGenerate = async () => {
    if (!goal.trim()) return
    if (!architectId) return toast.error('Агент Архитектор не найден')
    setIsGenerating(true)
    const toastId = toast.loading('Архитектор проектирует...')

    try {
      const result = await runAgent(architectId, {
        query: `Цель: ${goal}.`,
        scope: scope.slug,
        scopeId: scope.id,
      })

      console.log('🏗 [ROADMAP_DEBUG] Result:', result)

      const createStep = result.execution_trace?.find(
        (t) => t.tool.toUpperCase() === 'CREATE_BLUEPRINT'
      )

      if (!createStep) {
        toast.warning('Агент не вызвал инструмент чертежа', {
          id: toastId,
          description: `Инструменты в ответе: ${result.commands
            .map((c) => c.tool)
            .join(', ')}`,
        })
        return
      }

      if (createStep.status !== 'success') {
        // Инструмент был вызван, но упал (Ошибка прав или Zod)
        toast.error(`Сбой инструмента: ${createStep.status}`, {
          id: toastId,
          description: createStep.error_details || 'Ошибка выполнения',
        })
        return
      }

      // Если статус success, но в базе нет - значит проблема с выборкой (scope_id mismatch)
      const bp = await getLatestBlueprint(scope.id)

      if (bp) {
        setPendingBlueprint(bp)
        toast.success('Чертеж готов к проверке!', { id: toastId })
        setGoal('')
      } else {
        toast.error('Чертеж создан, но не найден', {
          id: toastId,
          description: `Scope ID запроса: ${scope.id}. Проверь таблицу blueprints.`,
        })
      }
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  // Колбек для обновления данных после применения
  const onBlueprintProcessed = async () => {
    setPendingBlueprint(null)
    // После применения обновляем активный план
    const active = await getActiveBlueprint(scope.id)
    setActiveBlueprint(active)

    // Рефетч задач
    const supabase = createClient()
    const freshItems = await fetchActiveItems(supabase, scope.id)
    setItems(freshItems)
  }

  const handleRestore = async () => {
    if (!selectedBlueprint) return
    const toastId = toast.loading('Восстановление...')
    try {
      // Логика: Применяем этот блюпринт заново (обновляем in_roadmap)
      // Либо создаем новый черновик на его основе (безопаснее)
      await restoreBlueprint(selectedBlueprint.id) // Просто пере-применяем

      // Обновляем данные
      const supabase = createClient()
      const freshItems = await fetchActiveItems(supabase, scope.id)
      setItems(freshItems)

      const newActive = await getActiveBlueprint(scope.id)
      setActiveBlueprint(newActive)
      setSelectedBlueprint(null) // Выход в Live

      toast.success('План восстановлен', { id: toastId })
    } catch (e) {
      toast.error(`Ошибка восстановления: ${e}`)
    }
  }

  if (selectedBlueprint && !selectedBlueprint.is_applied) {
    return (
      <div className="absolute inset-0 flex flex-col bg-card p-6 overflow-y-auto">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setSelectedBlueprint(null)}
            className="hover:bg-white/10 p-2 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold">Проверка чертежа</h2>
        </div>
        <BlueprintReview
          blueprint={selectedBlueprint}
          onComplete={async () => {
            setSelectedBlueprint(null)
            // Рефетч
            const supabase = createClient()
            const freshItems = await fetchActiveItems(supabase, scope.id)
            setItems(freshItems)
            const active = await getActiveBlueprint(scope.id)
            setActiveBlueprint(active)
          }}
        />
      </div>
    )
  }

  // 2. Режим Просмотра / Live
  const isPreviewMode = selectedBlueprint && selectedBlueprint.is_applied

  return (
    <div className="absolute inset-0 flex flex-col bg-card overflow-hidden">
      {/* ХЕДЕР */}
      <div
        className={`shrink-0 px-4 py-3 bg-muted/20 border-b border-border z-10 transition-colors ${
          isPreviewMode ? 'bg-purple-500/10' : 'bg-card'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
              {scope.name}
              {isPreviewMode && (
                <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Архив
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isPreviewMode
                ? `Просмотр версии: ${selectedBlueprint.name}`
                : activeBlueprint
                ? activeBlueprint.name
                : 'Нет активной стратегии'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isPreviewMode && (
              <button
                onClick={handleRestore}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors"
              >
                <RotateCcw size={14} /> Восстановить этот план
              </button>
            )}

            <BlueprintHistory
              scopeId={scope.id}
              activeBlueprintName={activeBlueprint?.name}
              onSelect={handleHistorySelect}
            />
          </div>
        </div>
      </div>

      {/* СКРОЛЛ-ЗОНА */}
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
          {/* ЗОНА РЕВЬЮ */}
          {pendingBlueprint && (
            <BlueprintReview
              blueprint={pendingBlueprint}
              onComplete={onBlueprintProcessed}
            />
          )}

          {/* ГЕНЕРАТОР / РЕВЬЮ */}
          {!pendingBlueprint && !isPreviewMode && (
            <div className="mt-6 group relative bg-muted/20 border border-border/50 hover:border-primary/10 p-1 rounded-2xl transition-all shadow-sm">
              <div className="absolute -inset-0.5 bg-linear-to-r from-pink-500/20 to-blue-500/20 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-card rounded-xl p-4 flex gap-4 items-center">
                <div className="flex-1 space-y-1">
                  <input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="Опиши цель (например: Запуск MVP за месяц)..."
                    className="w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/40 outline-none"
                  />
                  <p className="text-xs text-muted-foreground/80">
                    Нажми Enter для генерации стратегии
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Сгенерировать'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 3. ТАЙМЛАЙН (Фазы) */}
          <div className="relative space-y-0">
            {/* Линия времени */}
            {objectives.length > 0 && (
              <div className="absolute left-4.75 top-4 bottom-4 w-0.5 bg-border/60" />
            )}

            {objectives.map((phase, index) => {
              const tasks = getChildTasks(phase.id)

              return (
                <div
                  key={phase.id}
                  className="relative pl-12 pb-12 last:pb-0 group"
                >
                  {/* Точка на линии */}
                  <div className="absolute left-0 top-1.5 w-10 h-10 flex items-center justify-center z-10">
                    <div className="w-4 h-4 rounded-full border-2 border-primary bg-card group-hover:bg-primary group-hover:scale-110 transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                  </div>

                  {/* Карточка Фазы */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-foreground">
                        {phase.content}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                        Phase {index + 1}
                      </span>
                    </div>

                    {/* Сетка задач этой фазы */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tasks.length === 0 ? (
                        <div className="p-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground/50 italic">
                          Нет задач в этой фазе
                        </div>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-4 bg-card hover:bg-muted/30 border border-border hover:border-primary/30 rounded-xl transition-all cursor-pointer flex items-start gap-3 group/task shadow-sm hover:shadow-md"
                          >
                            <div
                              className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                task.priority === 'high'
                                  ? 'bg-red-400'
                                  : 'bg-blue-400/50'
                              }`}
                            />
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-foreground/90 group-hover/task:text-primary transition-colors block">
                                {task.content}
                              </span>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {/* Кнопка добавления */}
                      <button className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all text-sm font-medium h-full min-h-20">
                        <Plus size={18} /> Добавить
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ORPHANS (Вне плана) */}
          {orphans.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                <Box size={16} /> Вне стратегии
              </h4>
              <div className="flex flex-wrap gap-2">
                {orphans.map((t) => (
                  <div
                    key={t.id}
                    className="px-3 py-1.5 bg-muted/30 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 cursor-pointer transition-colors"
                  >
                    {t.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
