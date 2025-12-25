'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CommandItem } from '@/components/ui/command'
import {
  Archive,
  CheckCircle2,
  Circle,
  CircleDot,
  FileBox,
  Focus,
  Lightbulb,
  ListTodo,
  StickyNote,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Item } from '@/lib/store'

interface OmniItemProps {
  item: Item
  filters: any
  onSelect: () => void
}

export function OmniItem({ item, filters, onSelect }: OmniItemProps) {
  return (
    <CommandItem
      value={item.content + (item.ai_tags?.join(' ') || '')}
      onSelect={onSelect}
      data-item-id={item.id}
      className="group flex items-center justify-between py-1.5 cursor-pointer aria-selected:bg-accent transition-all duration-75"
    >
      <div className="flex items-center gap-0 flex-1 min-w-0 mb-0.5">
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

          {/* Теги и мета */}
          {/* <div className="flex items-center gap-1 mt-0.5">
            {item.ai_tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground bg-secondary/50 px-1 rounded"
              >
                #{tag}
              </span>
            ))}
            {item.ai_tags && item.ai_tags?.length > 2 && (
              <span className="text-xs text-muted-foreground bg-secondary/50 px-1 rounded">
                ...
              </span>
            )}
          </div> */}
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

      {/* Если не в фокусе - показываем статус текстом (как было раньше) */}
      {!filters.activeStatus && (
        <span className="text-xs text-muted-foreground/50 group-aria-selected:hidden">
          <StatusIcon status={item.status!} />
        </span>
      )}
      {filters.activeStatus && item.type !== 'task' && (
        <span className="text-xs text-muted-foreground/50 group-aria-selected:hidden">
          <TypeIcon type={item.type!} />
        </span>
      )}
    </CommandItem>
  )
}

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

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'note':
      return <StickyNote strokeWidth={1.6} size={10} />
    case 'thought':
      return <Lightbulb strokeWidth={1.6} size={10} />
    case 'resource':
      return <FileBox strokeWidth={1.6} size={10} />
  }
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'today':
      return <Focus strokeWidth={1.6} size={10} />
    case 'planned':
      return <ListTodo strokeWidth={1.6} size={10} />
    case 'done':
      return <CheckCircle2 strokeWidth={1.6} size={10} />
    case 'archived':
      return <Archive strokeWidth={1.6} size={10} />
  }
}
