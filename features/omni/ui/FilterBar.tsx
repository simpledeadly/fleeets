'use client'

import React, { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  ListTodo,
  Focus,
  CheckCircle2,
  Archive,
  Tag as TagIcon,
  Zap,
  Filter,
  Lightbulb,
  FileText,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useOmniStore } from '../model/store'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { TagBadge } from './TagBadge'

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
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false)
  const { activeStatus, setActiveStatus, activeTags, toggleTag, topTags } =
    props

  const groupTags = topTags.filter((t) => t.startsWith('group:'))
  const regularTags = topTags.filter((t) => !t.startsWith('group:'))

  const groupedProjects = useMemo(() => {
    const groups: Record<string, string[]> = {}
    const soloProjects: string[] = []

    groupTags.forEach((tag) => {
      const tagName = tag.replace('group:', '')
      if (tagName.includes('/')) {
        const [prefix] = tagName.split('/')
        if (!groups[prefix]) groups[prefix] = []
        groups[prefix].push(tag)
      } else {
        soloProjects.push(tag)
      }
    })

    return { groups, soloProjects }
  }, [groupTags])

  const toggleGroup = (prefix: string, tags: string[]) => {
    const allSelected = tags.every((t) => activeTags.includes(t))

    if (allSelected) {
      // Если все выбраны — снимаем все
      tags.forEach((t) => {
        if (activeTags.includes(t)) toggleTag(t)
      })
    } else {
      // Иначе — выбираем те, что еще не выбраны
      tags.forEach((t) => {
        if (!activeTags.includes(t)) toggleTag(t)
      })
    }
  }

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
      icon: FileText,
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
    <div className="flex flex-col gap-1 p-2 border-b border-border bg-muted/20">
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
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center mb-1">
        <Filter size={14} className="text-muted-foreground shrink-0 mr-0.5" />
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
        <div className="flex items-center gap-2 border-t border-border/60 pt-2">
          <button
            onClick={() => setIsTagsModalOpen(true)}
            className="hover:bg-muted p-1 rounded-full transition-colors duration-100 text-muted-foreground hover:text-primary shrink-0 cursor-pointer"
          >
            <Folders size={14} className="shrink-0" />
          </button>

          {/* 2. СКРОЛЛИРУЕМЫЙ КОНТЕЙНЕР (только для тегов) */}
          <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar items-center">
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
        </div>
      )}

      {/* --- МОДАЛЬНОЕ ОКНО ВСЕХ ТЕГОВ --- */}
      <Dialog open={isTagsModalOpen} onOpenChange={setIsTagsModalOpen}>
        <DialogContent className="bg-card md:min-w-xl lg:min-w-3xl 2xl:min-w-5xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Filter size={16} /> Все теги системы
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* СЕКЦИЯ ПРОЕКТОВ */}
            {(Object.keys(groupedProjects.groups).length > 0 ||
              groupedProjects.soloProjects.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Folders size={14} /> Проекты
                </div>

                <div className="space-y-4">
                  {/* Отрисовка групп со слешем */}
                  {Object.entries(groupedProjects.groups).map(
                    ([prefix, tags]) => {
                      const allActive = tags.every((t) =>
                        activeTags.includes(t)
                      )
                      const someActive = tags.some((t) =>
                        activeTags.includes(t)
                      )

                      return (
                        <div key={prefix}>
                          <div className="flex flex-wrap gap-1 items-center">
                            {/* Родительский тег (Мастер-тег) */}
                            <span
                              onClick={() => toggleGroup(prefix, tags)}
                              className={cn(
                                'flex items-center grow justify-center text-xs px-2 py-1 rounded transition-all duration-150 cursor-pointer select-none font-bold',
                                allActive || someActive
                                  ? 'bg-primary text-primary-foreground border border-primary shadow-sm'
                                  : 'bg-primary/7 dark:bg-primary/12 text-primary border border-primary/12 hover:bg-primary/10 dark:hover:bg-primary/15'
                              )}
                            >
                              <Folders size={14} className="mr-1.5 shrink-0" />
                              {prefix}
                              <span className="ml-1.5 opacity-60 font-normal text-xs">
                                {
                                  tags.filter((t) => activeTags.includes(t))
                                    .length
                                }
                                /{tags.length}
                              </span>
                            </span>

                            {/* Дочерние теги */}
                            <div className="flex flex-wrap gap-1">
                              {tags.map((tag) => (
                                <TagBadge
                                  key={tag}
                                  tag={tag}
                                  isActive={activeTags.includes(tag)}
                                  onToggle={toggleTag}
                                  isChild // Новый проп для удаления префикса при отображении
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    }
                  )}

                  {/* Одиночные проекты (без слеша) */}
                  {groupedProjects.soloProjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-border/40">
                      {groupedProjects.soloProjects.map((tag) => (
                        <TagBadge
                          key={tag}
                          tag={tag}
                          isActive={activeTags.includes(tag)}
                          onToggle={toggleTag}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* СЕКЦИЯ ОБЫЧНЫХ ТЕГОВ */}
            {regularTags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <TagIcon size={14} /> Метки
                </div>
                <div className="flex flex-wrap gap-1">
                  {regularTags.map((tag) => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      isActive={activeTags.includes(tag)}
                      onToggle={toggleTag}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
