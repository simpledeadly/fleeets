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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  activeStatus: string | null
  setActiveStatus: (s: string | null) => void
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
  activeTags: string[]
  toggleTag: (t: string) => void
  topTags: string[]
}

export function FilterBar({
  activeStatus,
  setActiveStatus,
  isQuick,
  setIsQuick,
  isTask,
  setIsTask,
  isThought,
  setIsThought,
  isNote,
  setIsNote,
  isResource,
  setIsResource,
  activeTags,
  toggleTag,
  topTags,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 p-3 border-b border-border/40 bg-muted/20">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <FilterChip
          label="Все"
          active={activeStatus === null}
          onClick={() => setActiveStatus(null)}
        />
        <FilterChip
          label="Фокус"
          icon={<Focus size={12} />}
          active={activeStatus === 'today'}
          onClick={() =>
            setActiveStatus(activeStatus === 'today' ? null : 'today')
          }
        />
        <FilterChip
          label="План"
          icon={<ListTodo size={12} />}
          active={activeStatus === 'planned'}
          onClick={() =>
            setActiveStatus(activeStatus === 'planned' ? null : 'planned')
          }
        />
        <FilterChip
          label="Выполнено"
          icon={<CheckCircle2 size={12} />}
          active={activeStatus === 'done'}
          onClick={() =>
            setActiveStatus(activeStatus === 'done' ? null : 'done')
          }
        />
        <FilterChip
          label="Архивировано"
          icon={<Archive size={12} />}
          active={activeStatus === 'archived'}
          onClick={() =>
            setActiveStatus(activeStatus === 'archived' ? null : 'archived')
          }
        />
      </div>

      {topTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center">
          <Tag size={12} className="text-muted-foreground shrink-0 mr-1" />
          {topTags.map((tag) => (
            <Badge
              key={tag}
              variant={activeTags.includes(tag) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer text-[10px] h-5 px-2 font-normal transition-all hover:bg-primary/20 hover:text-primary',
                activeTags.includes(tag)
                  ? 'hover:bg-primary hover:text-primary-foreground'
                  : 'bg-transparent'
              )}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center">
        <Filter size={12} className="text-muted-foreground shrink-0 mr-1" />
        <Badge
          variant={isQuick ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer text-[10px] h-5 px-2 font-normal transition-all hover:bg-primary/20 hover:text-primary',
            isQuick
              ? 'hover:bg-primary hover:text-primary-foreground'
              : 'bg-transparent'
          )}
          onClick={() => setIsQuick(!isQuick)}
        >
          <Zap />
          Блиц
        </Badge>
        <Badge
          variant={isTask ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer text-[10px] h-5 px-2 font-normal transition-all hover:bg-primary/20 hover:text-primary',
            isTask
              ? 'hover:bg-primary hover:text-primary-foreground'
              : 'bg-transparent'
          )}
          onClick={() => setIsTask(!isTask)}
        >
          <CheckCircle2 />
          Задача
        </Badge>
        <Badge
          variant={isThought ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer text-[10px] h-5 px-2 font-normal transition-all hover:bg-primary/20 hover:text-primary',
            isThought
              ? 'hover:bg-primary hover:text-primary-foreground'
              : 'bg-transparent'
          )}
          onClick={() => setIsThought(!isThought)}
        >
          <Lightbulb />
          Идея
        </Badge>
        <Badge
          variant={isNote ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer text-[10px] h-5 px-2 font-normal transition-all hover:bg-primary/20 hover:text-primary',
            isNote
              ? 'hover:bg-primary hover:text-primary-foreground'
              : 'bg-transparent'
          )}
          onClick={() => setIsNote(!isNote)}
        >
          <StickyNote />
          Заметка
        </Badge>
        <Badge
          variant={isResource ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer text-[10px] h-5 px-2 font-normal transition-all hover:bg-primary/20 hover:text-primary',
            isResource
              ? 'hover:bg-primary hover:text-primary-foreground'
              : 'bg-transparent'
          )}
          onClick={() => setIsResource(!isResource)}
        >
          <FileBox />
          Ресурс
        </Badge>
      </div>
    </div>
  )
}

function FilterChip({ label, icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border shrink-0 cursor-pointer',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:bg-muted'
      )}
    >
      {icon}
      {label}
    </button>
  )
}
