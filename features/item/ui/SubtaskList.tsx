'use client'
import { useState } from 'react'
import { Plus, CheckCircle2, CornerDownRight } from 'lucide-react'
import { createItem } from '@/features/item'
import { toast } from 'sonner'
import { Item } from '@/lib/store'

export function SubtaskList({
  parentId,
  items,
}: {
  parentId: string
  items: Item[]
}) {
  const [value, setValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleAdd = async () => {
    if (!value.trim()) return
    setIsCreating(true)

    const result = await createItem(value, parentId)

    setIsCreating(false)
    if (result.success) {
      setValue('')
      toast.success('Подзадача создана')
    }
  }

  return (
    <div className="mt-3 space-y-2 mb-2">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
        <CheckCircle2 size={12} />
        <span>Подзадачи</span>
      </div>

      {/* Список существующих */}
      <div className="space-y-1">
        {items.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-2 text-xs p-2 bg-white/5 rounded border border-white/5"
          >
            <CornerDownRight size={10} className="text-muted-foreground" />
            <span>{sub.content}</span>
          </div>
        ))}
      </div>

      {/* Инпут */}
      <div className="flex items-center gap-2 border-b border-white/20 pb-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Добавить шаг..."
          className="bg-transparent w-full text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <button
          onClick={handleAdd}
          disabled={isCreating}
          className="text-primary/60 hover:text-primary transition-colors duration-150 cursor-pointer"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
