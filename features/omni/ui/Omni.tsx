"use client"

import * as React from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/lib/store"
import { useCommandCenterStore } from "../model/store"
import { Layers, ListTodo, Focus, CheckCircle2, Archive, Circle, Tag, Check, BrainCircuit } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function Omni() {
  const { items, setFocusedItem, setView } = useStore()
  const { isPaletteOpen, closePalette } = useCommandCenterStore()

  const [activeStatus, setActiveStatus] = React.useState<string | null>(null)
  const [activeTags, setActiveTags] = React.useState<string[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")

  // --- 1. АНАЛИТИКА ТЕГОВ ---
  const allTags = React.useMemo(() => {
    const tagCounts: Record<string, number> = {}
    items.forEach(item => {
      item.ai_tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])
  }, [items])

  // --- 2. ФИЛЬТРАЦИЯ (Исправленная логика) ---
  const visibleItems = React.useMemo(() => {
    let result = items

    // А. Фильтр по статусу
    if (activeStatus) {
      result = result.filter(item => item.status === activeStatus)
    }

    // Б. Фильтр по тегам
    if (activeTags.length > 0) {
      result = result.filter(item => {
        if (!item.ai_tags) return false
        return activeTags.every(t => item.ai_tags!.includes(t))
      })
    }

    // В. 🔍 ПОИСК ПО ТЕКСТУ (РУЧНОЙ)
    // Мы делаем это здесь, чтобы искать по ВСЕМ элементам, а не только по видимым
    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter(item => {
        // Ищем в контенте ИЛИ в тегах
        return (
          item.content.toLowerCase().includes(lowerQuery) ||
          item.ai_tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        )
      })
    }

    // Г. Сортировка (Свежие сверху)
    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })

    // Д. ЛИМИТ (Оптимизация рендера)
    // Теперь мы режем УЖЕ НАЙДЕННЫЕ результаты.
    // Если ты нашел 200 задач по слову "молоко" (что вряд ли), покажем первые 30.
    // Это сохраняет мгновенную скорость открытия.
    // return result.slice(0, 30)
    return result.slice(0, 40)

  }, [items, activeStatus, activeTags, searchQuery])

  // --- ХЕЛПЕРЫ ---
  const toggleTag = (tag: string) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const run = (action: () => void) => {
    closePalette()
    action()
  }

  React.useEffect(() => {
    if (!isPaletteOpen) {
      const t = setTimeout(() => {
        setActiveStatus(null)
        setActiveTags([])
        setSearchQuery("")
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isPaletteOpen])

  return (
    <Dialog open={isPaletteOpen} onOpenChange={closePalette}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command
          shouldFilter={false}
          className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 **:[[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
            placeholder="Куда летим?"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          {/* ПАНЕЛЬ ФИЛЬТРОВ (без изменений) */}
          <div className="flex flex-col gap-2 p-3 border-b border-border/40 bg-muted/20">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <FilterChip label="Все" active={activeStatus === null} onClick={() => setActiveStatus(null)} />
              <FilterChip label="Inbox" icon={<Layers size={12} />} active={activeStatus === 'inbox'} onClick={() => setActiveStatus(activeStatus === 'inbox' ? null : 'inbox')} />
              <FilterChip label="Focus" icon={<Focus size={12} />} active={activeStatus === 'today'} onClick={() => setActiveStatus(activeStatus === 'today' ? null : 'today')} />
              <FilterChip label="Plan" icon={<ListTodo size={12} />} active={activeStatus === 'planned'} onClick={() => setActiveStatus(activeStatus === 'planned' ? null : 'planned')} />
              <FilterChip label="Done" icon={<Check size={12} />} active={activeStatus === 'done'} onClick={() => setActiveStatus(activeStatus === 'done' ? null : 'done')} />
              <FilterChip label="Archived" icon={<Archive size={12} />} active={activeStatus === 'archived'} onClick={() => setActiveStatus(activeStatus === 'archived' ? null : 'archived')} />
            </div>

            {allTags.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center">
                <Tag size={12} className="text-muted-foreground shrink-0 mr-1" />
                {allTags.slice(0, 8).map(tag => (
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

          <CommandList>
            <CommandEmpty>Ничего не найдено.</CommandEmpty>

            {/* Навигацию показываем только в пустом состоянии */}
            {searchQuery === "" && !activeStatus && activeTags.length === 0 && (
              <>
                <CommandGroup heading="Действия">
                  <CommandItem onSelect={() => alert("AI Chat coming soon")}>
                    <BrainCircuit className="h-4 w-4 text-amber-500" /> Спросить AI (начни с ?)
                  </CommandItem>
                </CommandGroup>

                <CommandGroup heading="Навигация">
                  <CommandItem onSelect={() => run(() => setView('inbox'))}>
                    <Layers className="h-4 w-4" /> Инбокс
                  </CommandItem>
                  <CommandItem onSelect={() => run(() => setView('focus'))}>
                    <Focus className="h-4 w-4" /> Фокус
                  </CommandItem>
                  <CommandItem onSelect={() => run(() => setView('plan'))}>
                    <ListTodo className="h-4 w-4" /> План
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* СПИСОК ЗАДАЧ */}
            <CommandGroup heading={searchQuery ? `Найдено (${visibleItems.length})` : "Последние задачи"}>
              {visibleItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.content} // value нужен для ключа, хоть фильтрация отключена
                  onSelect={() => run(() => setFocusedItem(item))}
                  className="cursor-pointer"
                >
                  {item.type === 'task' && item.status === 'done' ?
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                    item.type === 'task' && item.status !== 'done' &&
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  }

                  <span className={cn("flex-1 truncate", item.status === 'done' && "line-through text-muted-foreground")}>
                    {item.content}
                  </span>

                  <div className="ml-auto flex gap-1">
                    {item.ai_tags && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                        {item.ai_tags[0]}
                      </span>
                    )}
                    {item.ai_tags && item.ai_tags.length > 1 && (<span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                      ...
                    </span>)}
                  </div>

                  <div className="flex text-xs text-muted-foreground">
                    {item.status}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

          </CommandList>
        </Command>
      </DialogContent >
    </Dialog >
  )
}

function FilterChip({ label, icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border shrink-0",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      )}
    >
      {icon}
      {label}
    </button>
  )
}