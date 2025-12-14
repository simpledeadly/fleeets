"use client"

import { useEffect, useState } from "react"
import {
  Sparkles, Loader2, CheckCircle2, CalendarDays,
  StickyNote, Lightbulb, CheckSquare,
  Mic, Hash, FileText
} from "lucide-react"
import { findSimilarItems } from "@/features/ai/actions"
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface SimilarItemResult {
  id: string
  content: string
  description: string | null
  status: 'inbox' | 'planned' | 'today' | 'done' | 'archived' | 'deleted'
  type: 'task' | 'note' | 'thought' | 'resource'
  ai_tags: string[] | null
  metadata: any
  execution_log: string | null
  created_at: string
  completed_at: string | null
  similarity: number
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'note': return <StickyNote size={12} className="text-blue-500" />
    case 'thought': return <Lightbulb size={12} className="text-purple-500" />
    case 'resource': return <Lightbulb size={12} className="text-shadow-cyan-500" />
    default: return <CheckSquare size={12} className="text-emerald-500" /> // task
  }
}

export function SimilarItems({ itemId }: { itemId: string }) {
  // Указываем тип стейта явно
  const [items, setItems] = useState<SimilarItemResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    findSimilarItems(itemId).then((res) => {
      // Приводим тип, так как RPC возвращает any[]
      setItems(res as unknown as SimilarItemResult[])
      setLoading(false)
    })
  }, [itemId])

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-muted-foreground w-4 h-4" /></div>

  if (items.length === 0) {
    return (
      <div className="p-4 text-center border border-dashed border-border rounded-xl flex flex-col gap-1">
        <p className="text-sm text-muted-foreground font-medium">AI Context пуст</p>
        <p className="text-sm text-muted-foreground/80">Нейросеть не нашла похожие элементы</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles size={12} className="text-amber-500" />
        <span>AI Context</span>
      </div>

      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative p-3 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/60 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1">
                {/* Контент */}
                <p className={cn(
                  "text-md font-medium line-clamp-2",
                  item.status === 'done' && "line-through text-muted-foreground"
                )}>
                  {item.content}
                </p>
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-2">
                    {item.description}
                  </p>
                )}

                {/* ТИП ЭЛЕМЕНТА (Мини-бэйджик) */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-background/50 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground border border-border/50">
                    <TypeIcon type={item.type} />
                    <span className="capitalize">{item.type}</span>
                  </div>
                </div>
              </div>

              {/* Статус (Справа) */}
              {item.status === 'done' ? (
                <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
              ) : (
                <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/50 shrink-0 mt-0.5" />
              )}
            </div>

            {/* 🔥 СРЕДНЯЯ ЧАСТЬ: ТЕГИ И АССЕТЫ */}
            <div className="mt-2 flex flex-wrap gap-2 items-center">

              {/* 1. Если это было голосовое (source: 'voice' или 'telegram') */}
              {(item.metadata?.source === 'voice' || item.metadata?.duration) && (
                <div className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20">
                  <Mic size={10} />
                  <span>Voice</span>
                </div>
              )}

              {/* 2. Теги (первые 2, чтобы не захламлять) */}
              {item.ai_tags?.slice(0, 2).map(tag => (
                <div key={tag} className="flex items-center gap-1 text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                  <Hash size={9} />
                  <span>{tag}</span>
                </div>
              ))}

              {/* 3. Сниппет лога (если есть) */}
              {item.execution_log && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 italic">
                  <FileText size={10} />
                  <span className="max-w-37 truncate">
                    {item.execution_log}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                <CalendarDays size={10} />
                <span>
                  {item.completed_at
                    ? `Завершено ${formatDistanceToNow(new Date(item.completed_at), { addSuffix: true, locale: ru })}`
                    : formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })
                  }
                </span>
              </div>

              <span className="text-[10px] font-mono text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {(item.similarity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}