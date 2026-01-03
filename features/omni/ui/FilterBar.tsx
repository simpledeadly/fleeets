'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  ListTodo,
  Focus,
  CheckCircle2,
  Archive,
  Tag,
  Zap,
  Filter,
  Lightbulb,
  StickyNote,
  FileBox,
  Folders,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOmniStore } from '../model/store'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'

// --- Types ---

interface FilterBarProps {
  activeStatus: string | null
  setActiveStatus: (s: string | null) => void

  // Boolean filters
  isQuick: boolean | null
  setIsQuick: (s: boolean | null) => void
  isTask: boolean | null
  setIsTask: (s: boolean | null) => void
  isThought: boolean | null
  setIsThought: (s: boolean | null) => void
  isNote: boolean | null
  setIsNote: (s: boolean | null) => void
  isResource: boolean | null
  setIsResource: (s: boolean | null) => void

  // Tags
  activeTags: string[]
  toggleTag: (t: string) => void
  topTags: string[]

  // Visibility Limit
  visibleLimit: number
  setVisibleLimit: (l: number) => void
}

// --- Configurations ---

type StatusConfig = {
  id: string | null
  label: string
  icon?: LucideIcon
}

const STATUS_FILTERS: StatusConfig[] = [
  { id: 'today', label: 'Фокус', icon: Focus },
  { id: 'planned', label: 'План', icon: ListTodo },
  { id: 'done', label: 'Выполнено', icon: CheckCircle2 },
  { id: 'archived', label: 'Архивировано', icon: Archive },
]

// --- Main Component ---

export function FilterBar(props: FilterBarProps) {
  const { activeStatus, setActiveStatus, activeTags, toggleTag, topTags } =
    props

  const groupTags = topTags.filter((t) => t.startsWith('group:'))
  const regularTags = topTags.filter((t) => !t.startsWith('group:'))

  // Конфигурация для нижнего ряда фильтров (зависит от пропсов)
  const typeFilters = [
    {
      label: 'Блиц',
      icon: Zap,
      active: props.isQuick,
      toggle: () => props.setIsQuick(!props.isQuick),
    },
    {
      label: 'Задача',
      icon: CheckCircle2,
      active: props.isTask,
      toggle: () => props.setIsTask(!props.isTask),
    },
    {
      label: 'Идея',
      icon: Lightbulb,
      active: props.isThought,
      toggle: () => props.setIsThought(!props.isThought),
    },
    {
      label: 'Заметка',
      icon: StickyNote,
      active: props.isNote,
      toggle: () => props.setIsNote(!props.isNote),
    },
    {
      label: 'Ресурс',
      icon: FileBox,
      active: props.isResource,
      toggle: () => props.setIsResource(!props.isResource),
    },
  ]

  return (
    <div className="flex flex-col gap-2 p-3 border-b border-border/40 bg-muted/20">
      {/* 1. Верхний ряд: Статусы и Лимит */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pb-1">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((status) => (
            <FilterChip
              key={String(status.id)}
              label={status.label}
              icon={status.icon}
              active={props.activeStatus === status.id}
              onClick={() =>
                props.setActiveStatus(
                  props.activeStatus === status.id ? null : status.id
                )
              }
            />
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={String(props.visibleLimit)}
            onValueChange={(val) => props.setVisibleLimit(Number(val))}
          >
            <SelectTrigger className="max-h-6.5 rounded-full text-xs font-semibold bg-card/20 text-primary border-border hover:bg-muted transition-all duration-100 shadow-none cursor-pointer">
              <SelectValue placeholder="50" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="250">250</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* 2. Нижний ряд: Типы и Флаги */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center">
        <Filter size={14} className="text-muted-foreground shrink-0 mr-1" />
        {typeFilters.map((filter) => (
          <FilterBadge
            key={filter.label}
            active={!!filter.active}
            onClick={filter.toggle}
            icon={filter.icon}
          >
            {filter.label}
          </FilterBadge>
        ))}
      </div>
      {/* 3. Ряд: Группы (Manual Groups) */}
      {groupTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center border-t border-border/50 pt-2">
          <Folders size={14} className="text-muted-foreground shrink-0 mr-1" />
          {groupTags.map((tag) => (
            <div key={tag} className="flex items-center group/badge relative">
              <FilterBadge
                active={activeTags.includes(tag)}
                onClick={() => toggleTag(tag)}
                className="pr-6" // Только отступ для иконок управления
              >
                {tag.replace('group:', '')}
              </FilterBadge>
              <div className="absolute right-1.5 flex gap-1 opacity-0 group-hover/badge:opacity-100 transition-opacity">
                <button
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation()
                    const groupName = tag.replace('group:', '')
                    const newName = prompt('Переименовать группу:', groupName)
                    if (newName && newName !== groupName) {
                      const newTag = `group:${newName}`
                      // Оптимистичное обновление в сторе
                      useStore.getState().renameGroup(tag, newTag)

                      import('@/features/item').then(({ renameGroup }) => {
                        renameGroup(tag, newName).catch((err) => {
                          console.error('Failed to rename group:', err)
                          // В случае ошибки возвращаем как было
                          useStore.getState().renameGroup(newTag, tag)
                        })
                      })
                    }
                  }}
                  className="p-0.5 hover:text-primary text-muted-foreground transition-colors"
                >
                  <Pencil size={10} />
                </button>
                <button
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Удалить эту группу?')) {
                      // Сохраняем для отката если надо (но тут проще просто перечитать из БД)
                      // [ROUND 18] Если группа активна в фильтре - убираем её
                      if (activeTags.includes(tag)) {
                        toggleTag(tag)
                      }

                      useStore.getState().deleteGroup(tag)

                      import('@/features/item').then(
                        ({ deleteGroup: deleteAction }) => {
                          deleteAction(tag).catch((err) => {
                            console.error('Failed to delete group:', err)
                          })
                        }
                      )
                    }
                  }}
                  className="p-0.5 hover:text-destructive text-muted-foreground transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Sub-components ---

function FilterChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon?: LucideIcon
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-100 border shrink-0 cursor-pointer',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card/20 text-primary border-border hover:bg-muted'
      )}
    >
      {Icon && <Icon size={16} />}
      {label}
    </button>
  )
}

function FilterBadge({
  active,
  onClick,
  children,
  icon: Icon,
  className,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <Badge
      variant={active ? 'default' : 'outline'}
      className={cn(
        'cursor-pointer text-xs h-5 px-2 font-normal transition-all duration-100 hover:bg-primary/20 hover:text-primary gap-1',
        active
          ? 'hover:bg-primary hover:text-primary-foreground'
          : 'bg-card/20 text-primary border-border hover:bg-muted',
        className
      )}
      onClick={onClick}
    >
      {Icon && <Icon size={14} />}
      {children}
    </Badge>
  )
}
