'use client'
import { motion } from 'framer-motion'
import { Calendar, EyeClosed } from 'lucide-react'
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
      // onClick={onFlip} // Клик по фону переворачивает обратно (как было)
      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      className="absolute w-full h-full p-6 rounded-3xl border bg-background text-white shadow-2xl flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold uppercase text-foreground">
          Метаданные
        </h4>
        <div className="flex items-center gap-1.5 mt-1 text-zinc-400">
          <Calendar size={12} />
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
          <EyeClosed size={20} />
        </button>
      </div>

      {/* Редактируемый RAW */}
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
    </motion.div>
  )
}
