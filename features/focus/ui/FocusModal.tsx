"use client"

import { X, CheckCircle2 } from "lucide-react"
// 👇 Добавляем DialogTitle в импорт
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { type Item } from "@/lib/store"
import { SimilarItems } from "./SimilarItems"

interface FocusModalProps {
  item: Item | null
  isOpen: boolean
  onClose: () => void
}

export function FocusModal({ item, isOpen, onClose }: FocusModalProps) {
  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 gap-0 overflow-hidden bg-card flex flex-col sm:rounded-3xl border-border outline-none">
        <DialogTitle className="sr-only">
          Режим фокуса: {item.content}
        </DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Focus Mode</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">

          {/* Main Task */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              {item.content}
            </h1>
            {item.description && (
              <p className="text-lg text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* Timer Placeholder */}
          <div className="h-32 rounded-2xl bg-secondary/20 border border-dashed border-border flex items-center justify-center text-muted-foreground">
            Таймер и Start/Stop будут здесь
          </div>

          {/* AI MEMORY (RAG) */}
          <SimilarItems itemId={item.id} />

          {/* Execution Log (Input) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Execution Log</label>
            <textarea
              className="w-full bg-secondary/30 rounded-xl p-4 min-h-37 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
              placeholder="Пиши сюда мысли, заметки, код... Это уйдет в базу знаний."
            />
          </div>

          {/* Отступ снизу, чтобы контент не перекрывался футером */}
          <div className="h-24" />
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border/50 bg-card/80 backdrop-blur-sm absolute bottom-0 w-full flex gap-4">
          <button className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <CheckCircle2 size={20} />
            Завершить задачу
          </button>
        </div>

      </DialogContent>
    </Dialog>
  )
}