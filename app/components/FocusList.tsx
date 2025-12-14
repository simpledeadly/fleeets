"use client"

import { type Item, useStore } from "@/lib/store"

export default function FocusList({ onItemClick }: { onItemClick?: (item: Item) => void }) {
  const { items } = useStore()

  // Фильтруем задачи (Today + Planned, например)
  const focusItems = items.filter(i => i.status === 'today' && !i.completed_at)

  if (focusItems.length === 0) {
    return <div className="text-center text-muted-foreground mt-10">Всё чисто ✨</div>
  }

  return (
    <div className="w-full space-y-3">
      {focusItems.map(item => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className="p-4 bg-card border border-border/60 rounded-xl hover:border-border cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
        >
          <div className="font-medium">{item.content}</div>
          {item.description && <div className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</div>}
        </div>
      ))}
    </div>
  )
}