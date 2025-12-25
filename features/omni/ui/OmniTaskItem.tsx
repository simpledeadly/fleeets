'use client'

import { CommandItem } from '@/components/ui/command'
import {
  CheckCircle2,
  Circle,
  CircleDot,
  FileBox,
  Lightbulb,
  StickyNote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Item } from '@/lib/store'

interface OmniTaskItemProps {
  item: Item
  filters: any
  onSelect: () => void
}

export function OmniTaskItem({ item, filters, onSelect }: OmniTaskItemProps) {
  return (
    <CommandItem
      value={item.content + (item.ai_tags?.join(' ') || '')}
      onSelect={onSelect}
      data-item-id={item.id}
      className="group flex items-center justify-between py-1.5 cursor-pointer aria-selected:bg-accent"
    >
      <div className="flex items-center gap-0 flex-1 min-w-0">
        {/* Иконка статуса */}
        <div className="shrink-0 text-muted-foreground group-aria-selected:text-foreground transition-colors">
          {item.status === 'done' && item.type === 'task' ? (
            <CheckCircle2 size={16} className="text-green-500 mr-2" />
          ) : item.status === 'today' && item.type === 'task' ? (
            <CircleDot size={16} className="mr-2" />
          ) : item.priority === 'critical' && item.type === 'task' ? (
            <Circle size={16} className="text-red-500 mr-2" />
          ) : item.priority === 'high' && item.type === 'task' ? (
            <Circle className=" text-red-400 mr-2" size={16} />
          ) : (
            item.type === 'task' && <Circle className="mr-2" size={16} />
          )}
        </div>

        <div className="flex flex-col overflow-hidden">
          <span
            className={cn(
              'truncate font-medium transition-colors',
              item.status === 'done' && 'line-through text-muted-foreground',
              'group-aria-selected:text-primary' // Подсветка при выборе
            )}
          >
            {item.content}
          </span>

          {/* Теги и мета */}
          <div className="flex items-center gap-1 mt-0.5">
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
          </div>
        </div>
      </div>

      {/* БЛОК ШОРТКАТОВ (Виден только при фокусе) */}
      <div className="hidden group-aria-selected:flex items-center gap-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-left-1 duration-150">
        {item.status !== 'done' && (
          <>
            {item.type === 'task' ? (
              <>
                <div className="flex items-center gap-0 bg-card border border-border px-1.5 py-0.5 rounded">
                  <span className="font-sans">⌘</span>
                  <span>D</span>
                  {/* <span className="ml-1 opacity-70">Done</span> */}
                </div>

                <div className="flex items-center gap-0 bg-card border border-border px-1.5 py-0.5 rounded">
                  <span className="font-sans">⌘</span>
                  <span>F</span>
                  {/* <span className="ml-1 opacity-70">Focus</span> */}
                </div>
                
                <div className="flex items-center gap-0 bg-card border border-border px-1.5 py-0.5 rounded">
                  <span className="font-sans">⌘</span>
                  <span>I</span>
                  {/* <span className="ml-1 opacity-70">Inbox</span> */}
                </div>
              </>
            ) : (
              item.status === 'archived' && (
                <div className="flex items-center gap-0 bg-card border border-border px-1.5 py-0.5 rounded">
                  <span className="font-sans">⌘</span>
                  <span>I</span>
                  {/* <span className="ml-1 opacity-70">Inbox</span> */}
                </div>
              )
            )}
          </>
        )}

        <div className="flex items-center gap-0 bg-card border border-border px-1.5 py-0.5 rounded">
          <span className="font-sans">⌘</span>
          <span>Del</span>
          {/* <span className="ml-1 opacity-70">Delete</span> */}
        </div>

        {/* <div className="flex items-center gap-0 bg-card border border-border px-1.5 py-0.5 rounded">
          <span className="font-sans">Enter</span>
          <span className="ml-1 opacity-70">Open</span>
        </div> */}
      </div>

      {/* Если не в фокусе - показываем статус текстом (как было раньше) */}
      {!filters.activeStatus && (
        <span className="text-xs text-muted-foreground/50 group-aria-selected:hidden">
          {item.status}
        </span>
      )}
      {filters.activeStatus && item.status === 'archived' && (
        <span className="text-xs text-muted-foreground group-aria-selected:hidden">
          <TypeIcon type={item.type!} />
        </span>
      )}
    </CommandItem>
  )
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'note':
      return (
        <StickyNote strokeWidth={1.6} size={10} className="text-blue-500/80" />
      )
    case 'thought':
      return (
        <Lightbulb strokeWidth={1.6} size={10} className="text-purple-500/80" />
      )
    case 'resource':
      return (
        <FileBox strokeWidth={1.6} size={10} className="text-orange-500/80" />
      )
  }
}
