'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import {
  ArrowUp,
  CheckCircle2,
  CornerDownRight,
  Save,
  Settings,
  X,
} from 'lucide-react'
import { useStore, type Item } from '@/lib/store'
import { useDebounce } from '@/lib/hooks'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { SimilarItems } from './SimilarItems'
import { Timer as FocusTimer } from './Timer'
import { updateExecutionLog, completeItem } from '@/features/item'
import { getFocusViewData } from '../model/actions'
import { cn } from '@/lib/utils'

interface FocusModalProps {
  item: Item | null
  isOpen: boolean
  onClose: () => void
}

// type FocusData = { totalDuration: number; similarItems: any[] }

export function FocusModal({ item, isOpen, onClose }: FocusModalProps) {
  const { items, focusItem, setFocusItem, setEditingItem } = useStore()

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

  const handleComplete = async () => {
    // 1. Салют!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 },
      zIndex: 9999, // Поверх модалки
    })

    // 2. Логика
    await completeItem(item!.id)

    // 3. Закрываем через мгновение
    setTimeout(() => {
      onClose()
    }, 1000)
  }

  return (
    <Dialog open={!!focusItem} onOpenChange={() => setFocusItem(null)}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 gap-0 overflow-hidden bg-card flex flex-col sm:rounded-3xl border-border outline-none">
        {item && (
          <>
            <DialogTitle>Режим фокуса: {item.content}</DialogTitle>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingItem(focusItem)}
                  className="p-2 hover:bg-secondary rounded-full"
                >
                  <Settings size={16} />
                </button>
                <button onClick={() => setFocusItem(null)} className="p-2 ...">
                  <X size={20} />
                </button>

                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Focus Mode
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
              {/* "ХЛЕБНЫЕ КРОШКИ" (Breadcrumbs) */}
              {parentTask && (
                <button
                  onClick={() => setFocusItem(parentTask)}
                  className="flex items-center text-xs text-muted-foreground hover:text-primary font-medium transition-colors mb-4 cursor-pointer"
                >
                  <ArrowUp size={20} />
                  <span>{parentTask.content}</span>
                </button>
              )}

              {/* Main Task */}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                  {item.content}
                </h1>
                {item.description && (
                  <p className="text-lg text-muted-foreground leading-normal">
                    {item.description}
                  </p>
                )}
              </div>

              {/* ПОДЗАДАЧИ */}
              {subtasks.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-dashed">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground">
                    Подзадачи
                  </h3>
                  <div className="space-y-2">
                    {subtasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setFocusItem(task)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                      >
                        <CornerDownRight
                          size={14}
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
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Execution Log
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
                  className="caret-accented w-full bg-secondary/30 rounded-xl p-4 min-h-37 resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  placeholder="Пиши сюда мысли, заметки, код... Это уйдет в базу знаний."
                />
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-md text-muted-foreground font-medium">
                  Исходный текст:
                </p>
                <p className="text-sm text-muted-foreground/70">
                  {item.raw_content}
                </p>
              </div>
              <div className="h-20" />
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm absolute bottom-0 w-full flex gap-4">
              <button
                onClick={handleComplete}
                className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={20} />
                Завершить задачу
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
