'use client'

import { motion } from 'framer-motion'
import {
  Mic,
  Sparkles,
  Eye,
  Zap,
  StickyNote,
  Lightbulb,
  CheckSquare,
  FileBox,
} from 'lucide-react'
import { type Item } from '@/lib/store'
import { useItemActions } from '@/features/item/model/useItemActions'
import { cn } from '@/lib/utils'

interface CardFaceProps {
  item: Item
  isProcessing: boolean
  onRefine: (e: React.MouseEvent) => void
  onFlip: (e: React.MouseEvent) => void
  index: number
  total: number
  setEditing: (isEditing: boolean) => void
}

export function CardFace({
  item,
  isProcessing,
  onRefine,
  onFlip,
  total,
  setEditing,
}: CardFaceProps) {
  const { update, toggleBlitz, setType } = useItemActions(item)

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

        {/* Счетчик */}
        <span className="text-[10px] font-mono text-muted-foreground/50">
          #{total}
        </span>
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
          className="w-full bg-transparent text-md font-medium text-muted-foreground leading-tight text-center text-balance resize-none focus:outline-none placeholder:text-muted-foreground/20 min-h-12"
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
      <div className="flex justify-between items-center pt-4 border-t border-border">
        {/* Блиц (Твоя просьба) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleBlitz()
          }}
          className={cn(
            'p-2 rounded-full transition-colors cursor-pointer',
            item.is_quick
              ? 'text-amber-500 bg-amber-500/10'
              : 'text-muted-foreground hover:bg-muted'
          )}
          title="Блиц (2-5 мин)"
        >
          <Zap size={20} fill={item.is_quick ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={onFlip}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Eye size={20} />
        </button>

        <button
          onClick={onRefine}
          disabled={isProcessing}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles size={20} />
          )}
        </button>
      </div>
    </motion.div>
  )
}
