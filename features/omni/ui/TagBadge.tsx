import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Folders } from 'lucide-react'

export function TagBadge({
  tag,
  isActive,
  onToggle,
}: {
  tag: string
  isActive: boolean
  onToggle: (t: string) => void
}) {
  const isTagsAsWall = useStore((state) => state.isTagsAsWall)
  const isGroup = tag.startsWith('group:')
  const displayLabel = isGroup ? tag.replace('group:', '') : tag

  return (
    <span
      key={tag}
      onClick={() => onToggle(tag)}
      className={cn(
        'flex items-center text-xs px-1.5 py-0.5 rounded transition-all duration-150 cursor-pointer select-none',
        isTagsAsWall && 'justify-center grow text-center',
        isGroup
          ? 'bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15 text-primary border border-primary/5'
          : 'bg-muted/60 hover:bg-muted text-accent-foreground/80 border border-primary/5',
        isActive && 'border-primary/25'
      )}
    >
      {isGroup && <Folders size={12} className="mr-1 shrink-0 opacity-80" />}
      {displayLabel}
    </span>
  )
}
