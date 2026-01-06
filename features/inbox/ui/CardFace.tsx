'use client'

import { motion } from 'framer-motion'
import {
  Mic,
  Sparkles,
  Eye,
  FileText,
  Lightbulb,
  CheckSquare,
  FileBox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Item } from '@/lib/store'
import { useItemActions } from '@/features/item'
import { MagicButton } from '@/features/agents'

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
}: CardFaceProps) {
  const { update, setType } = useItemActions(item)

  const types = [
    { id: 'task', icon: CheckSquare },
    { id: 'note', icon: FileText },
    { id: 'thought', icon: Lightbulb },
    { id: 'resource', icon: FileBox },
  ] as const

  return (
    <motion.div
      style={{ backfaceVisibility: 'hidden' }}
      className="absolute w-full h-full p-4 rounded-3xl border bg-card shadow-2xl flex flex-col columns-2"
    >
      {/* --- Верхняя часть: ТИПЫ + СЧЕТЧИК --- */}
      <div className="flex justify-between items-center mb-4">
        {/* Выбор типа (твоя просьба) */}
        <div className="flex gap-1 rounded-lg bg-accent dark:bg-background p-1">
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
                  ? 'text-primary bg-muted-foreground/15 dark:bg-primary/10'
                  : 'text-muted-foreground/50 hover:text-muted-foreground'
              )}
            >
              <t.icon size={18} strokeWidth={2} />
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          {/* Счетчик */}
          <span className="text-sm font-mono font-medium text-muted-foreground/50">
            1/{total}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onFlip(e)
            }}
            className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
            title="Показать исходник и связи"
          >
            <Eye strokeWidth={1.6} size={22} />
            {/* <BurningEye /> */}
          </button>
        </div>
      </div>

      {/* --- Центральная часть (РЕДАКТИРУЕМЫЙ Контент) --- */}
      <div className="flex-1 flex flex-col justify-start gap-2">
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
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder="Заголовок"
          className="w-full line-clamp-3 mt-2 bg-transparent text-2xl font-bold leading-tight text-center text-balance resize-none focus:outline-none placeholder:text-muted-foreground/20"
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
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder="Описание..."
          className="flex-1 w-full bg-transparent text-md font-mono text-muted-foreground leading-tight text-center text-balance resize-none focus:outline-none placeholder:text-muted-foreground/20"
        />

        {(item.metadata as any)?.source === 'voice' && (
          <div className="mt-1 mb-3 flex items-center justify-center gap-1 text-blue-600 dark:text-blue-500 bg-card py-1.5 px-2.5 rounded-full w-fit mx-auto border border-border">
            <Mic size={16} />
            <span className="text-xs font-medium">Голос</span>
          </div>
        )}
      </div>

      {/* --- Нижняя часть (Кнопки действий) --- */}
      <div className="flex justify-around items-center pt-2 border-t border-border">
        <MagicButton
          itemId={item.id}
          agentId={'ec8de888-28e0-41ea-9a7b-bbe41ea0460e'}
        />
        <button
          onClick={onRefine}
          disabled={isProcessing}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted  hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent hover:text-primary rounded-full animate-spin" />
          ) : (
            <Sparkles strokeWidth={1.6} size={22} />
          )}
        </button>
      </div>
    </motion.div>
  )
}
