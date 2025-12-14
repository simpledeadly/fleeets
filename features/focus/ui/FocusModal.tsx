"use client"

import { useState, useEffect } from "react"
import confetti from "canvas-confetti"
import { CheckCircle2, Save, X } from "lucide-react"
import { type Item } from "@/lib/store"
import { useDebounce } from "@/lib/hooks"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { SimilarItems } from "./SimilarItems"
import { Timer as FocusTimer } from "./Timer"
import { updateExecutionLog, completeItem } from "../model/actions"

interface FocusModalProps {
  item: Item | null
  isOpen: boolean
  onClose: () => void
}

export function FocusModal({ item, isOpen, onClose }: FocusModalProps) {
  const [logText, setLogText] = useState(item?.execution_log || "")
  const [isSaving, setIsSaving] = useState(false)

  // Храним ID предыдущего элемента, чтобы отслеживать изменения
  const [prevItemId, setPrevItemId] = useState(item?.id)

  if (item?.id !== prevItemId) {
    setPrevItemId(item?.id)
    setLogText(item?.execution_log || "")
  }

  const debouncedLog = useDebounce(logText, 1000)

  // Сохранение (только если текст реально изменился пользователем)
  useEffect(() => {
    if (!item) return
    // Не сохраняем, если текст совпадает с исходным (мы его только что загрузили)
    if (debouncedLog === (item.execution_log || "")) return

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

  if (!item) return null

  const handleComplete = async () => {
    // 1. Салют!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 },
      zIndex: 9999 // Поверх модалки
    })

    // 2. Логика
    await completeItem(item!.id)

    // 3. Закрываем через мгновение
    setTimeout(() => {
      onClose()
    }, 1000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 gap-0 overflow-hidden bg-card flex flex-col sm:rounded-3xl border-border outline-none">
        <DialogTitle className="sr-only">
          Режим фокуса: {item.content}
        </DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Focus Mode</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">

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

          {/* Timer */}
          <FocusTimer itemId={item.id} />

          {/* AI MEMORY (RAG) */}
          <SimilarItems itemId={item.id} />

          {/* Execution Log (Input) */}
          <div className="space-y-2 relative">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Execution Log</label>
              {/* Индикатор сохранения */}
              {isSaving ? (
                <span className={`text-xs flex gap-1 transition-opacity duration-150 ${isSaving ? 'opacity-100 text-amber-500' : 'opacity-0'}`}>
                  Сохранение... <Save size={16} />
                </span>
              ) : logText.length !== 0 ? <X size={16} className='text-muted-foreground cursor-pointer' onClick={() => handleRemoveExecutionLog(item.id)} /> : ''
              }
            </div>

            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              className="caret-accented w-full bg-secondary/30 rounded-xl p-4 min-h-37 resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
              placeholder="Пиши сюда мысли, заметки, код... Это уйдет в базу знаний."
            />
          </div>

          <div className='flex flex-col gap-1'>
            <p className="text-md text-muted-foreground font-medium">Исходный текст:</p>
            <p className="text-sm text-muted-foreground/70">
              {item.raw_content}
            </p>
          </div>
          <div className="h-20" />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm absolute bottom-0 w-full flex gap-4">
          <button onClick={handleComplete} className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer">
            <CheckCircle2 size={20} />
            Завершить задачу
          </button>
        </div>

      </DialogContent>
    </Dialog>
  )
}