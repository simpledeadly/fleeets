"use client"

import { useEffect, useState } from "react"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { findSimilarItems } from "@/features/ai/actions"

// 👇 ВОТ ОН, ТОТ САМЫЙ ТИП
interface SimilarItemResult {
  id: string
  content: string
  similarity: number // Число от 0 до 1
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

  // 👇 ВРЕМЕННЫЙ ДЕБАГ: Показываем сообщение, если пусто
  if (items.length === 0) {
    return (
      <div className="p-4 text-center border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted-foreground">AI Context пуст</p>
        <p className="text-[10px] text-red-400 mt-1">Проверь консоль сервера</p>
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
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium line-clamp-2">{item.content}</p>
              {/* Стрелочка появляется при ховере */}
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary -ml-4 group-hover:ml-0" />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(item.similarity * 100).toFixed(0)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {(item.similarity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}