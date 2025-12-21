'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useStore } from '@/lib/store'
import { useOmniStore } from '../model/store'
import { Layers, Focus, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Импорт декомпозированных частей
import { useOmniFilter } from '../model/useOmniFilter'
import { FilterBar } from './FilterBar'
import { OmniChat } from './OmniChat'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

export function Omni() {
  const { setFocusItem, setView } = useStore()
  const { isPaletteOpen, closePalette } = useOmniStore()

  // Логика фильтров
  const filter = useOmniFilter()

  // Режим AI: Если запрос начинается с ?
  const isAiMode = filter.searchQuery.startsWith('?')

  const run = (action: () => void) => {
    closePalette()
    action()
  }

  return (
    <Command shouldFilter={false} className="h-full">
      <Dialog open={isPaletteOpen} onOpenChange={closePalette}>
        <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-200 sm:rounded-2xl border-border/60 bg-background/95 backdrop-blur-xl">
          <VisuallyHidden>
            <DialogTitle className="sr-only">Командный центр</DialogTitle>
          </VisuallyHidden>

          {/* РЕЖИМ 1: AI CHAT */}
          {isAiMode ? (
            <OmniChat initialQuery={filter.searchQuery} />
          ) : (
            /* РЕЖИМ 2: СТАНДАРТНЫЙ ПОИСК */
            <Command shouldFilter={false} className="h-full">
              <CommandInput
                placeholder="Куда летим? (? для вопроса AI)"
                value={filter.searchQuery}
                onValueChange={filter.setSearchQuery}
              />

              <FilterBar {...filter} />

              <CommandList className="max-h-100">
                <CommandEmpty>Ничего не найдено.</CommandEmpty>

                {/* Навигация (только в пустом состоянии) */}
                {filter.isDefaultView && (
                  <>
                    <CommandGroup heading="Быстрый переход">
                      <CommandItem onSelect={() => run(() => setView('inbox'))}>
                        <Layers className="h-4 w-4" />Инбокс
                      </CommandItem>
                      <CommandItem onSelect={() => run(() => setView('focus'))}>
                        <Focus className="h-4 w-4" />Фокус
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                {/* СПИСОК ЗАДАЧ */}
                <CommandGroup
                  heading={
                    filter.searchQuery
                      ? `Найдено (${filter.visibleItems.length})`
                      : 'Последние задачи'
                  }
                >
                  {filter.visibleItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.content} // value нужен для ключа, хоть фильтрация отключена
                      onSelect={() => run(() => setFocusItem(item))}
                      className="cursor-pointer"
                    >
                      {item.type === 'task' && item.status === 'done' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        item.type === 'task' &&
                        item.status !== 'done' && (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )
                      )}

                      <span
                        className={cn(
                          'flex-1 truncate',
                          item.status === 'done' &&
                            'line-through text-muted-foreground'
                        )}
                      >
                        {item.content}
                      </span>

                      <div className="ml-auto flex gap-1">
                        {item.ai_tags && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                            {item.ai_tags[0]}
                          </span>
                        )}
                        {item.ai_tags && item.ai_tags.length > 1 && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                            ...
                          </span>
                        )}
                      </div>
                      {!filter.activeStatus && (
                        <div className="flex text-xs text-muted-foreground">
                          {item.status}
                        </div>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </DialogContent>
      </Dialog>
    </Command>
  )
}
