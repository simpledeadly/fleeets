'use client'

import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CommandItem } from '@/components/ui/command'
import { CheckCircle2, Circle, CircleDot, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Item } from '@/lib/store'

interface OmniItemProps {
  item: Item
  // filters: any
  onSelect: () => void
}

const OmniItemComponent = ({ item, onSelect }: OmniItemProps) => {
  return (
    <CommandItem
      value={item.content + (item.ai_tags?.join(' ') || '')}
      onSelect={onSelect}
      data-item-id={item.id}
      className="group flex items-center justify-between py-1.5 cursor-pointer aria-selected:bg-accent transition-all duration-75"
    >
      <div className="flex items-center gap-0 flex-1 min-w-0 my-px">
        {/* Иконка статуса */}
        <div className="shrink-0 transition-colors">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.status} // Перерисовка при смене статуса
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0.5 }}
              transition={{ duration: 0.05 }}
            >
              <TaskStatusIcon item={item} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col overflow-hidden">
          <span
            className={cn(
              'truncate font-mono transition-all duration-150',
              item.status === 'done' && 'line-through text-muted-foreground',
              'group-aria-selected:text-primary' // Подсветка при выборе
            )}
          >
            {item.content}
          </span>
        </div>
      </div>

      {/* БЛОК ШОРТКАТОВ (Виден только при фокусе) */}
      <div className="hidden group-aria-selected:flex items-center gap-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-left-1 duration-100">
        {item.status !== 'done' && (
          <>
            {item.type === 'task' ? (
              <>
                <Kbd keys={['⌘', 'D']} />
                <Kbd keys={['⌘', 'F']} />
                <Kbd keys={['⌘', 'I']} />
              </>
            ) : (
              item.status === 'archived' && <Kbd keys={['⌘', 'I']} />
            )}
          </>
        )}
        <Kbd keys={['⌘', 'Del']} />
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
    prev.item.status === next.item.status &&
    prev.item.content === next.item.content &&
    prev.item.priority === next.item.priority &&
    prev.item.ai_tags?.length === next.item.ai_tags?.length
  )
}

export const OmniItem = memo<OmniItemProps>(OmniItemComponent, propsAreEqual)

function TaskStatusIcon({ item }: { item: Item }) {
  // Если не задача - ничего не рисуем (или можно добавить иконку типа)
  if (item.type !== 'task') return null

  // Выполнено
  if (item.status === 'done' && item.is_quick !== true) {
    return <CheckCircle2 size={16} className="text-green-500 mr-2" />
  } else if (item.status === 'done' && item.is_quick === true) {
    return <Zap size={16} className="text-amber-500 mr-2" />
  }

  // Блиц
  if (item.is_quick === true) {
    return <Zap size={16} className="mr-2" />
  }

  const priorityColor =
    item.priority === 'critical'
      ? 'text-red-600'
      : item.priority === 'high'
      ? 'text-red-400'
      : 'text-muted-foreground' // Обычный серый для medium/low

  // Сегодня (Фокус) - Точка в центре
  if (item.status === 'today') {
    return <CircleDot size={16} className={cn('mr-2', priorityColor)} />
  }

  return <Circle size={16} className={cn('mr-2', priorityColor)} />
}

function Kbd({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5 bg-card border border-border px-1.5 py-0.5 rounded shadow-xs min-w-5 justify-center">
      {keys.map((k, i) => (
        <span key={i} className={k === '⌘' ? 'font-sans' : ''}>
          {k}
        </span>
      ))}
    </div>
  )
}
