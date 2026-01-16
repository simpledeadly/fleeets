'use client'

import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CommandItem } from '@/components/ui/command'
import { CheckCircle2, Circle, CircleDot, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Item } from '@/lib/store'

interface OmniItemProps {
  item: Item
  isSelected?: boolean
  opacity?: number
  activeTags: string[]
  onSelect: (multi?: boolean) => void
}

const OmniItemComponent = ({
  item,
  isSelected,
  opacity,
  activeTags,
  onSelect,
}: OmniItemProps) => {
  return (
    <CommandItem
      value={item.id + item.content}
      onSelect={() => onSelect(false)}
      style={{ opacity }}
      data-item-id={item.id}
      className={cn(
        'group flex items-center justify-between aria-selected:bg-accent py-1.5 cursor-pointer transition-all duration-75',
        isSelected && 'bg-accent/50 border-l-2 rounded-none border-primary'
      )}
    >
      <div className="flex items-center gap-0 flex-1 min-w-0 my-px">
        {/* Иконка статуса */}
        <div className="shrink-0 transition-colors">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${item.id}-${item.status}-${item.priority}-${item.is_quick}`}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0.5 }}
              transition={{ duration: 0.05 }}
            >
              <TaskStatusIcon item={item} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col min-w-0 pr-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className={cn(
                'truncate text-primary transition-all duration-150',
                item.status === 'done' && 'line-through text-muted-foreground',
                'group-aria-selected:text-foreground' // Подсветка при выборе
              )}
            >
              {item.content}
            </span>

            {/* Группы */}
            {item.ai_tags
              ?.filter(
                (tag) => tag.startsWith('group:') && !activeTags.includes(tag)
              )
              .map((tag) => (
                <span
                  key={tag}
                  className="hidden md:block shrink-0 px-1.5 bg-muted text-primary rounded-full text-xs font-medium tracking-tight border border-border"
                >
                  {tag.replace('group:', '')}
                </span>
              ))}
          </div>
        </div>
      </div>
    </CommandItem>
  )
}

const propsAreEqual = (
  prev: Readonly<OmniItemProps>,
  next: Readonly<OmniItemProps>
) => {
  return (
    prev.item.id === next.item.id &&
    prev.isSelected === next.isSelected &&
    prev.item.content === next.item.content &&
    prev.item.type === next.item.type &&
    prev.item.status === next.item.status &&
    prev.item.is_quick === next.item.is_quick &&
    prev.item.priority === next.item.priority &&
    JSON.stringify(prev.activeTags) === JSON.stringify(next.activeTags) &&
    prev.item.ai_tags?.length === next.item.ai_tags?.length
  )
}

export const OmniItem = memo<OmniItemProps>(OmniItemComponent, propsAreEqual)

function TaskStatusIcon({ item }: { item: Item }) {
  // 1. Если не задача — ничего не рисуем
  if (item.type !== 'task') return null

  const isFocus = item.status === 'today'
  const isDone = item.status === 'done'

  // Цвет всегда привязан к приоритету
  const priorityColor =
    item.priority === 'critical'
      ? 'text-red-600'
      : item.priority === 'high'
      ? 'text-red-400'
      : 'text-muted-foreground'

  // 2. ВЫПОЛНЕНО (Done)
  if (isDone) {
    return item.is_quick ? (
      <Zap size={16} className="text-amber-500 mr-2" /> // Цветной, без заливки
    ) : (
      <CheckCircle2 size={16} className="text-green-500 mr-2" />
    )
  }

  // 3. БЛИЦ (is_quick)
  if (item.is_quick) {
    return (
      <Zap
        size={16}
        className={cn(
          'mr-2 transition-all duration-200',
          priorityColor, // ВСЕГДА цвет приоритета
          isFocus && 'fill-current' // Заливка ТОЛЬКО в фокусе
        )}
      />
    )
  }

  // 4. ОБЫЧНАЯ ЗАДАЧА (Task)
  return isFocus ? (
    <CircleDot size={16} className={cn('mr-2', priorityColor)} />
  ) : (
    <Circle size={16} className={cn('mr-2', priorityColor)} />
  )
}
