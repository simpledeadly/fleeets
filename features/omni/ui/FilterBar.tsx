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
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

// --- Configurations ---

type StatusConfig = {
  id: string | null
  label: string
  icon?: LucideIcon
}

const STATUS_FILTERS: StatusConfig[] = [
  { id: null, label: 'Все' },
  { id: 'today', label: 'Фокус', icon: Focus },
  { id: 'planned', label: 'План', icon: ListTodo },
  { id: 'done', label: 'Выполнено', icon: CheckCircle2 },
  { id: 'archived', label: 'Архивировано', icon: Archive },
]

// --- Main Component ---

export function FilterBar(props: FilterBarProps) {
  const { activeStatus, setActiveStatus, activeTags, toggleTag, topTags } =
    props

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
      {/* 1. Верхний ряд: Статусы */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {STATUS_FILTERS.map((status) => (
          <FilterChip
            key={String(status.id)}
            label={status.label}
            icon={status.icon}
            active={activeStatus === status.id}
            onClick={() =>
              setActiveStatus(activeStatus === status.id ? null : status.id)
            }
          />
        ))}
      </div>

      {/* 2. Средний ряд: Теги */}
      {/* {topTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center">
          <Tag size={14} className="text-muted-foreground shrink-0 mr-1" />
          {topTags.map((tag) => (
            <FilterBadge
              key={tag}
              active={activeTags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </FilterBadge>
          ))}
        </div>
      )} */}

      {/* 3. Нижний ряд: Типы и Флаги */}
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
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: LucideIcon
}) {
  return (
    <Badge
      variant={active ? 'default' : 'outline'}
      className={cn(
        'cursor-pointer text-xs h-5 px-2 font-normal transition-all duration-100 hover:bg-primary/20 hover:text-primary gap-1',
        active
          ? 'hover:bg-primary hover:text-primary-foreground'
          : 'bg-card/20 text-primary border-border hover:bg-muted'
      )}
      onClick={onClick}
    >
      {Icon && <Icon size={14} />}
      {children}
    </Badge>
  )
}
