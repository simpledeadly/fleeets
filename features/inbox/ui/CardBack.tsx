'use client'
import { motion } from 'framer-motion'
import { Calendar, EyeClosed, Text } from 'lucide-react'
import { type Item } from '@/lib/store'
import { useItemActions } from '@/features/item'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface CardBackProps {
  item: Item
  onFlip: (e: React.MouseEvent) => void
  setEditing: (val: boolean) => void
}

export function CardBack({ item, onFlip, setEditing }: CardBackProps) {
  const { update } = useItemActions(item)

  return (
    <motion.div
      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      className="absolute w-full h-full p-4 rounded-3xl border bg-card text-white shadow-2xl flex flex-col"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-500">
          <Text size={14} />
          Исходный текст
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-zinc-400">
          <Calendar strokeWidth={1.6} size={14} />
          <span className="text-xs font-medium font-mono">
            {item.created_at
              ? format(new Date(item.created_at), 'd MMM HH:mm', { locale: ru })
              : 'Неизвестно'}
          </span>
        </div>
        <button
          onClick={onFlip}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-primary transition-colors cursor-pointer"
        >
          <EyeClosed strokeWidth={1.6} size={22} />
        </button>
      </div>

      {/* Редактируемый RAW */}
      <div
        className="flex-1 h-full overflow-y-auto no-scrollbar"
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
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder="Исходного текста нет, но можно добавить"
          onClick={(e) => e.stopPropagation()}
          className="w-full h-full block bg-transparent text-foreground overflow-y-auto no-scrollbar whitespace-pre-wrap resize-none focus:outline-none"
        />
      </div>
    </motion.div>
  )
}
