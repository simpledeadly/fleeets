'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Mic,
  Sparkles,
  Eye,
  Zap,
  StickyNote,
  Lightbulb,
  CheckSquare,
  FileBox,
  CheckCircle2,
  Spline,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore, type Item } from '@/lib/store'
import { useItemActions, completeItem, decomposeTask } from '@/features/item'

interface CardFaceProps {
  item: Item
  isProcessing: boolean
  onRefine: (e: React.MouseEvent) => void
  onFlip: (e: React.MouseEvent) => void
  index: number
  total: number
  setEditing: (isEditing: boolean) => void
  hasSimilar: boolean
}

export function CardFace({
  item,
  isProcessing,
  onRefine,
  onFlip,
  total,
  setEditing,
  // hasSimilar,
}: CardFaceProps) {
  const { update, toggleBlitz, setType } = useItemActions(item)
  const [isDecomposing, setIsDecomposing] = useState(false)

  // Новый хендлер
  const handleDecompose = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDecomposing(true)

    const result = await decomposeTask(item.id)

    setIsDecomposing(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      // Здесь можно показать результат (например, в модалке)
      // Или просто сказать "Готово, 3 подзадачи в Инбоксе"
      toast.success(`Задача разбита на шаги!\nШагов: ${result.count}`)
      // После этого исходная задача должна удалиться или уйти в архив
    }

    if (result.success && result.newItems) {
      result.newItems.forEach((newItem) => useStore.getState().addItem(newItem))
      useStore.getState().removeItem(item.id)
    }
  }

  const types = [
    { id: 'task', icon: CheckSquare },
    { id: 'note', icon: StickyNote },
    { id: 'thought', icon: Lightbulb },
    { id: 'resource', icon: FileBox },
  ] as const

  return (
    <motion.div
      style={{ backfaceVisibility: 'hidden' }}
      className="absolute w-full h-full p-6 rounded-3xl border bg-card shadow-2xl flex flex-col"
    >
      {/* --- Верхняя часть: ТИПЫ + СЧЕТЧИК --- */}
      <div className="flex justify-between items-center mb-2">
        {/* Выбор типа (твоя просьба) */}
        <div className="flex gap-1">
          {types.map((t) => (
            <button
              key={t.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setType(t.id)
              }}
              className={cn(
                'p-1.5 rounded-md transition-all duration-150 cursor-pointer',
                item.type === t.id
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground/50 hover:text-muted-foreground'
              )}
            >
              <t.icon size={16} />
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          {/* Счетчик */}
          <span className="text-sm font-mono font-medium text-muted-foreground/50">
            #{total}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onFlip(e)
            }}
            className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
            title="Показать исходник и связи"
          >
            <Eye strokeWidth={1.6} size={20} />
            {/* <BurningEye /> */}
          </button>
        </div>
      </div>

      {/* --- Центральная часть (РЕДАКТИРУЕМЫЙ Контент) --- */}
      <div className="flex-1 flex flex-col justify-center gap-2">
        {/* Заголовок-Textarea */}
        <textarea
          key={`title-${item.id}-${item.content}`} // Пересоздать, если контент изменился на сервере
          defaultValue={item.content}
          onFocus={() => setEditing(true)}
          onBlur={(e) => {
            setEditing(false)
            // Сохраняем только если текст отличается от того, что в пропсе
            if (e.target.value !== item.content)
              update({ content: e.target.value })
          }}
          className="w-full bg-transparent text-2xl font-bold leading-tight text-center text-balance resize-none focus:outline-none placeholder:text-muted-foreground/20 overflow-hidden"
          placeholder="Заголовок"
          rows={2} // Примерная высота
          style={{ fieldSizing: 'content' } as any} // Новый CSS для автовысоты (если поддерживается), иначе фиксированный rows
        />

        {/* Описание-Textarea */}
        <textarea
          key={`desc-${item.id}-${item.description}`}
          defaultValue={item.description || ''}
          onFocus={() => setEditing(true)}
          onBlur={(e) => {
            setEditing(false)
            if (e.target.value !== (item.description || ''))
              update({ description: e.target.value })
          }}
          className="w-full bg-transparent text-md font-medium text-muted-foreground leading-tight text-center text-balance resize-none focus:outline-none placeholder:text-muted-foreground/20 min-h-36"
          placeholder="Описание..."
        />

        {(item.metadata as any)?.source === 'voice' && (
          <div className="mt-1 flex items-center justify-center gap-1 text-blue-600 dark:text-blue-500 bg-card py-1.5 px-2.5 rounded-full w-fit mx-auto border border-border">
            <Mic size={14} />
            <span className="text-xs font-bold">Голос</span>
          </div>
        )}
      </div>

      {/* --- Нижняя часть (Кнопки действий) --- */}
      <div className="flex justify-around items-center pt-2 border-t border-border">
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleBlitz()
          }}
          className={cn(
            'p-2 rounded-full transition-colors cursor-pointer',
            item.is_quick
              ? 'text-amber-500 bg-amber-500/10'
              : 'text-muted-foreground hover:bg-muted hover:text-primary'
          )}
          title="Блиц (2-5 мин)"
        >
          <Zap
            strokeWidth={1.6}
            size={20}
            fill={item.is_quick ? 'currentColor' : 'none'}
          />
        </button>

        <button
          onClick={async () => completeItem(item.id)}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted  hover:text-primary transition-colors cursor-pointer"
        >
          <CheckCircle2 strokeWidth={1.6} size={20} />
        </button>

        <button
          onClick={handleDecompose}
          disabled={isDecomposing || isProcessing}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
          title="Разбить на шаги (AI)"
        >
          {isDecomposing ? (
            <Loader2 strokeWidth={1.6} size={20} className="animate-spin" />
          ) : (
            <Spline strokeWidth={1.6} size={20} />
          )}
        </button>

        <button
          onClick={onRefine}
          disabled={isProcessing}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted  hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent hover:text-primary rounded-full animate-spin" />
          ) : (
            <Sparkles strokeWidth={1.6} size={20} />
          )}
        </button>
      </div>
    </motion.div>
  )
}
