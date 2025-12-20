'use client'
import { motion } from 'framer-motion'
import { Calendar, EyeClosed, Link, Loader2 } from 'lucide-react'
import { useStore, type Item } from '@/lib/store'
import { useItemActions } from '@/features/item'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface CardBackProps {
  item: Item
  onFlip: (e: React.MouseEvent) => void
  setEditing: (val: boolean) => void
  similarItems: Item[]
  isSearching: boolean
}

export function CardBack({
  item,
  onFlip,
  setEditing,
  similarItems,
  isSearching,
}: CardBackProps) {
  const { update } = useItemActions(item)
  const { setFocusItem } = useStore()

  return (
    <motion.div
      // onClick={onFlip} // Клик по фону переворачивает обратно (как было)
      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      className="absolute w-full h-full p-6 rounded-3xl border bg-background text-white shadow-2xl flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold uppercase text-foreground">
          Метаданные
        </h4>
        <div className="flex items-center gap-1.5 mt-1 text-zinc-400">
          <Calendar strokeWidth={1.6} size={12} />
          <span className="text-[10px] font-mono">
            {item.created_at
              ? format(new Date(item.created_at), 'd MMM HH:mm', { locale: ru })
              : 'Неизвестно'}
          </span>
        </div>
        <button
          onClick={onFlip}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <EyeClosed strokeWidth={1.6} size={20} />
        </button>
      </div>

      {/* Редактируемый RAW */}
      <div
        className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <textarea
          key={`rawc-${item.id}-${item.raw_content}`}
          defaultValue={item.raw_content || ''}
          onFocus={() => setEditing(true)}
          onBlur={(e) => {
            setEditing(false)
            if (e.target.value !== (item.raw_content || ''))
              update({ raw_content: e.target.value })
          }}
          placeholder="Исходного текста нет, но можно сюда добавить"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 w-full bg-transparent text-foreground overflow-y-auto whitespace-pre-wrap resize-none focus:outline-none"
        />
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
          <Link size={12} />
          <span>Найденные связи</span>
        </div>

        {isSearching && (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-zinc-500" />
          </div>
        )}

        {!isSearching && similarItems.length > 0 && (
          <div className="space-y-1">
            {similarItems.slice(0, 3).map((similar: any) => (
              <button
                key={similar.id}
                onClick={() => setFocusItem(similar)}
                className="w-full text-left text-xs p-2 rounded bg-white/5 hover:bg-white/10 transition-colors truncate"
              >
                - {similar.content}
                <span className="font-mono opacity-50 ml-2">
                  ({Math.round(similar.similarity * 100)}%)
                </span>
              </button>
            ))}
          </div>
        )}

        {!isSearching && similarItems.length === 0 && (
          <p className="text-xs text-zinc-600 italic">
            Похожих записей не найдено.
          </p>
        )}
      </div>
    </motion.div>
  )
}
