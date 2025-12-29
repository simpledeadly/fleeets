'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { ArrowUp, CheckCircle2, CornerDownRight, Save, X } from 'lucide-react'
import { useStore, type Item } from '@/lib/store'
import { useDebounce } from '@/lib/hooks'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { SimilarItems } from './SimilarItems'
import { Timer as FocusTimer } from './Timer'
import { updateExecutionLog, updateItem } from '@/features/item'
import { getFocusViewData } from '../model/actions'
import { cn } from '@/lib/utils'

interface FocusModalProps {
  item: Item | null
  isOpen: boolean
  onClose: () => void
}

// type FocusData = { totalDuration: number; similarItems: any[] }

export function FocusModal({ item, isOpen, onClose }: FocusModalProps) {
  const {
    items,
    focusItem,
    setFocusItem,
    updateItem: updateStoreItem,
  } = useStore()

  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [logText, setLogText] = useState('')
  const [viewData, setViewData] = useState<{
    totalDuration: number
    similarItems: any[]
  } | null>(null)

  // 🔥 ГЛАВНЫЙ ФИКС: isSaving возвращается в стейт
  const [isSaving, setIsSaving] = useState(false)

  const subtasks = items.filter((sub) => sub.parent_id === focusItem?.id)
  const parentTask = focusItem?.parent_id
    ? items.find((p) => p.id === focusItem.parent_id)
    : null

  const dataCache = useRef<
    Record<string, { totalDuration: number; similarItems: any[] }>
  >({})

  useEffect(() => {
    const loadData = async () => {
      if (isOpen && item?.id) {
        if (dataCache.current[item.id]) {
          console.log('⚡️ Hit Cache for', item.id)
          setViewData(dataCache.current[item.id])
          setStatus('success')
          return // ⛔️ ВЫХОДИМ, ЗАПРОС НЕ ДЕЛАЕМ
        }

        setStatus('loading')
        const data = await getFocusViewData(item.id)

        dataCache.current[item.id] = data
        setViewData(data)
        setStatus('success')
      } else {
        setStatus('idle')
        setViewData(null)
      }
    }
    loadData()
  }, [item?.id, isOpen])

  useEffect(() => {
    if (isOpen && item) {
      // Обновляем, только если текст реально отличается
      const t = setTimeout(() => {
        setLogText((prev) =>
          item.execution_log !== prev ? item.execution_log || '' : prev
        )
      }, 0)
      return () => clearTimeout(t)
    }
  }, [item?.execution_log, isOpen])

  const debouncedLog = useDebounce(logText, 1000)
  useEffect(() => {
    if (!item) return
    if (debouncedLog === (item.execution_log || '')) return
    if (debouncedLog === '' && item.execution_log === null) return

    const save = async () => {
      setIsSaving(true)
      await updateExecutionLog(item.id, debouncedLog)
      setIsSaving(false)
    }
    save()
  }, [debouncedLog, item])

  const handleRemoveExecutionLog = async (itemId: string) => {
    if (!logText) return
    setLogText('')
    await updateExecutionLog(itemId, '')
  }

  const handleComplete = async (item: Item) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 },
      zIndex: 999,
    })

    // 1. Optimistic UI (через алиас стора)
    updateStoreItem({ ...item, status: 'done' })

    // 3. Server Action (2 аргумента: ID и данные)
    await updateItem(item.id, { status: 'done' })

    // 3. Закрываем через мгновение
    setTimeout(() => {
      onClose()
    }, 500)
  }

  return (
    <Dialog open={!!focusItem} onOpenChange={() => setFocusItem(null)}>
      <DialogContent className="max-w-2xl h-screen md:h-[90vh] p-0.5 gap-0 overflow-hidden bg-card flex flex-col rounded-none md:rounded-3xl border-none md:border border-border outline-none">
        {item && (
          <>
            <DialogTitle className="sr-only">
              Режим фокуса: {item.content}
            </DialogTitle>

            <div className="flex-1 overflow-y-auto p-2 pt-12 md:p-4 md:pt-12 space-y-8">
              {/* "ХЛЕБНЫЕ КРОШКИ" (Breadcrumbs) */}
              {parentTask && (
                <button
                  onClick={() => setFocusItem(parentTask)}
                  className="flex gap-1 items-center text-xs text-muted-foreground hover:text-primary font-medium transition-colors mb-3 cursor-pointer"
                >
                  <ArrowUp size={18} />
                  <span>{parentTask.content}</span>
                </button>
              )}

              {/* Main Task */}
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold leading-tight">
                  {item.content}
                </h1>
                {item.description && (
                  <p className="text-md text-muted-foreground leading-normal">
                    {item.description}
                  </p>
                )}
              </div>

              {/* ПОДЗАДАЧИ */}
              {subtasks.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-dashed">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Задачи проекта
                  </h3>

                  <div className="space-y-2">
                    {subtasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setFocusItem(task)}
                        className="w-full text-sm text-left flex items-center gap-2 p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                      >
                        <CornerDownRight
                          size={18}
                          className="text-muted-foreground"
                        />
                        <span
                          className={cn(
                            'flex-1',
                            task.status === 'done' &&
                              'line-through text-muted-foreground'
                          )}
                        >
                          {task.content}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timer получает initialTotalSeconds из viewData */}
              <FocusTimer
                itemId={item.id}
                initialTotalSeconds={viewData?.totalDuration}
                isLoading={status === 'loading'}
              />

              {/* SimilarItems получает initialSimilarItems из viewData */}
              <SimilarItems
                items={viewData?.similarItems ?? null}
                isLoading={status === 'loading'}
              />

              {/* Execution Log (Input) */}
              <div className="space-y-2 relative">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Доп. сведения
                  </label>
                  {/* Индикатор сохранения */}
                  {isSaving ? (
                    <span
                      className={`text-xs flex gap-1 transition-opacity duration-150 ${
                        isSaving ? 'opacity-100 text-amber-500' : 'opacity-0'
                      }`}
                    >
                      Сохранение... <Save size={16} />
                    </span>
                  ) : logText.length !== 0 ? (
                    <X
                      size={16}
                      className="text-muted-foreground cursor-pointer"
                      onClick={() => handleRemoveExecutionLog(item.id)}
                    />
                  ) : (
                    ''
                  )}
                </div>

                <textarea
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  className="text-sm caret-accented w-full bg-secondary/30 rounded-xl p-3 min-h-37 resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all duration-100 placeholder:text-muted-foreground/50"
                  placeholder="Пиши сюда мысли, заметки, что угодно по теме. Это уйдет в базу знаний."
                />
              </div>

              {item.raw_content && (
                <div className="flex flex-col gap-1">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Исходный текст:
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    {item.raw_content}
                  </p>
                </div>
              )}

              <div className="h-12" />
            </div>

            {/* Footer Actions */}
            {item.type === 'task' && (
              <div className="p-2 border-t border-border/50 bg-card/80 backdrop-blur-lg absolute bottom-0 w-full flex gap-4">
                <button
                  onClick={() => handleComplete(item)}
                  className="flex-1 py-2 mb-5 md:mb-0 rounded-xl bg-primary text-primary-foreground font-semibold text-lg opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={22} strokeWidth={2.4} />
                  Завершить задачу
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
