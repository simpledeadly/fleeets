import { Badge } from "@/components/ui/badge"
import { Layers, ListTodo, Focus, CheckCircle2, Archive, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterBarProps {
  activeStatus: string | null
  setActiveStatus: (s: string | null) => void
  activeTags: string[]
  toggleTag: (t: string) => void
  topTags: string[]
}

export function FilterBar({ activeStatus, setActiveStatus, activeTags, toggleTag, topTags }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 p-3 border-b border-border/40 bg-muted/20">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <FilterChip label="Все" active={activeStatus === null} onClick={() => setActiveStatus(null)} />
        <FilterChip label="Focus" icon={<Focus size={12} />} active={activeStatus === 'today'} onClick={() => setActiveStatus(activeStatus === 'today' ? null : 'today')} />
        <FilterChip label="Plan" icon={<ListTodo size={12} />} active={activeStatus === 'planned'} onClick={() => setActiveStatus(activeStatus === 'planned' ? null : 'planned')} />
        <FilterChip label="Done" icon={<CheckCircle2 size={12} />} active={activeStatus === 'done'} onClick={() => setActiveStatus(activeStatus === 'done' ? null : 'done')} />
        <FilterChip label="Archived" icon={<Archive size={12} />} active={activeStatus === 'archived'} onClick={() => setActiveStatus(activeStatus === 'archived' ? null : 'archived')} />
      </div>

      {topTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center">
          <Tag size={12} className="text-muted-foreground shrink-0 mr-1" />
          {topTags.map(tag => (
            <Badge
              key={tag}
              variant={activeTags.includes(tag) ? "default" : "outline"}
              className={cn(
                "cursor-pointer text-[10px] h-5 px-2 font-normal transition-all hover:bg-primary/20 hover:text-primary",
                activeTags.includes(tag) ? "hover:bg-primary hover:text-primary-foreground" : "bg-transparent"
              )}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, icon, active, onClick }: any) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border shrink-0", active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted")}>
      {icon}{label}
    </button>
  )
}