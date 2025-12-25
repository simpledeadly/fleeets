'use client'

import { useEffect } from 'react'
import { Layers, Focus } from 'lucide-react'
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { useStore } from '@/lib/store'
import { useOmniStore } from '../model/store'

// Импорт декомпозированных частей
import { useOmniFilter } from '../model/useOmniFilter'
import { FilterBar } from './FilterBar'
import { OmniChat } from './OmniChat'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { OmniItem } from './OmniItem'
import { toast } from 'sonner'
import { softDeleteItem, updateItem } from '@/features/item'
import { useCmdkObserver } from '../model/useCmdkObserver'
import { OmniPreview } from './OmniPreview'

export function Omni() {
  const {
    setFocusItem,
    setView,
    items,
    updateItem: updateStoreItem,
    removeItem: removeStoreItem,
    addItem: addStoreItem,
  } = useStore()
  const { isPaletteOpen, closePalette, layout, setLayout } = useOmniStore()
  const activeItem = useCmdkObserver(isPaletteOpen)

  const handleLayoutChange = (sizes: number[]) => {
    // Сохраняем только если на экране реально две панели
    if (!isAiMode && sizes.length === 2) {
      setLayout(sizes)
    }
  }

  // Логика фильтров
  const filter = useOmniFilter()
  // Режим AI: Если запрос начинается с ?
  const isAiMode = filter.searchQuery.startsWith('?')

  const run = (action: () => void) => {
    closePalette()
    action()
  }

  useEffect(() => {
    if (!isPaletteOpen) return

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return

      if (e.key === 'd') {
        e.preventDefault()
        await triggerAction('toggleDone')
      }
      if (e.key === 'f') {
        e.preventDefault()
        await triggerAction('toggleFocused')
      }
      if (e.key === 'i') {
        e.preventDefault()
        await triggerAction('toggleInbox')
      }
      if (e.key === 'Delete') {
        e.preventDefault()
        await triggerAction('delete')
      }
    }

    const triggerAction = async (
      action: 'toggleDone' | 'toggleFocused' | 'toggleInbox' | 'delete'
    ) => {
      const selectedEl = document.querySelector(
        '[data-item-id][aria-selected="true"]'
      ) as HTMLElement
      if (!selectedEl) return

      const id = selectedEl.dataset.itemId
      if (!id) return

      const item = items.find((i) => i.id === id)
      if (!item) return

      if (action === 'toggleDone') {
        const newStatus = item.status === 'done' ? 'planned' : 'done'
        const previousItem = { ...item }

        // 1. Optimistic UI (через алиас стора)
        updateStoreItem({ ...item, status: newStatus })

        // 2. Undo Logic
        const undo = async () => {
          updateStoreItem(previousItem)
          await updateItem(item.id, previousItem)
        }

        toast.success(newStatus === 'done' ? 'Завершено' : 'Возвращено', {
          action: { label: 'Отмена', onClick: undo },
        })

        // 3. Server Action (2 аргумента: ID и данные)
        await updateItem(item.id, { status: newStatus })
      }

      if (action === 'toggleFocused') {
        const newStatus = item.status === 'today' ? 'planned' : 'today'
        const previousItem = { ...item }

        // 1. Optimistic UI (через алиас стора)
        updateStoreItem({ ...item, status: newStatus })

        // 2. Undo Logic
        const undo = async () => {
          updateStoreItem(previousItem)
          await updateItem(item.id, previousItem)
        }

        toast.success(
          newStatus === 'today' ? 'Назначено в фокус' : 'Возвращено',
          {
            action: { label: 'Отмена', onClick: undo },
          }
        )

        // 3. Server Action (2 аргумента: ID и данные)
        await updateItem(item.id, { status: newStatus })
      }

      if (action === 'toggleInbox') {
        const newStatus = item.status === 'inbox' ? item.status : 'inbox'
        const previousItem = { ...item }

        // 1. Optimistic UI (через алиас стора)
        updateStoreItem({ ...item, status: newStatus })

        // 2. Undo Logic
        const undo = async () => {
          updateStoreItem(previousItem)
          await updateItem(item.id, previousItem)
        }

        toast.success(
          newStatus === 'inbox' ? 'Перенесено во Входящие' : 'Возвращено',
          {
            action: { label: 'Отмена', onClick: undo },
          }
        )

        // 3. Server Action (2 аргумента: ID и данные)
        await updateItem(item.id, { status: newStatus })
      }

      if (action === 'delete') {
        const previousItem = { ...item }

        // UI
        removeStoreItem(item.id)

        // Undo
        const undo = async () => {
          addStoreItem(previousItem)
          await updateItem(item.id, { status: previousItem.status })
        }

        toast.success('Удалено', {
          action: { label: 'Вернуть', onClick: undo },
        })

        // Server Action (1 аргумент: ID)
        await softDeleteItem(item.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPaletteOpen, items, updateStoreItem, removeStoreItem, addStoreItem])

  return (
    <Command shouldFilter={false} className="h-full min-w-0">
      <Dialog open={isPaletteOpen} onOpenChange={closePalette}>
        <DialogContent className="h-150 sm:max-w-225 p-0 gap-0 block overflow-hidden bg-card border-border/60 shadow-2xl">
          <VisuallyHidden>
            <DialogTitle className="sr-only">Командный центр</DialogTitle>
          </VisuallyHidden>

          <ResizablePanelGroup
            direction="horizontal"
            className="w-full rounded-lg border-none"
            onLayout={handleLayoutChange}
          >
            <ResizablePanel defaultSize={layout[0]} minSize={30}>
              <div className="flex-1 flex flex-col min-w-0 relative">
                {/* ЛЕВАЯ ЧАСТЬ: Список (Занимает все место или часть) */}
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
                            <CommandItem
                              onSelect={() => run(() => setView('inbox'))}
                              className="cursor-pointer"
                            >
                              <Layers className="h-4 w-4" />
                              Инбокс
                            </CommandItem>
                            <CommandItem
                              onSelect={() => run(() => setView('focus'))}
                              className="cursor-pointer"
                            >
                              <Focus className="h-4 w-4" />
                              Фокус
                            </CommandItem>
                          </CommandGroup>
                          <CommandSeparator />
                        </>
                      )}

                      {/* СПИСОК ЗАДАЧ */}
                      <CommandGroup
                        heading={
                          filter.searchQuery
                            ? `Найдено (показано ${filter.visibleItems.length})`
                            : `Элементы (показано ${filter.visibleItems.length})`
                        }
                      >
                        {filter.visibleItems.map((item) => (
                          <OmniItem
                            key={item.id}
                            item={item}
                            filters={filter}
                            onSelect={() => run(() => setFocusItem(item))}
                          />
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>
            </ResizablePanel>

            {/* ПРАВАЯ КОЛОНКА (Превью) */}
            {/* Скрываем на мобилках (hidden), показываем на десктопе (md:flex) */}
            {!isAiMode && (
              <>
                <ResizableHandle withHandle className="bg-border" />

                <ResizablePanel
                  defaultSize={layout[1]}
                  minSize={30}
                  maxSize={70}
                  className="hidden md:block"
                >
                  <div className="h-full w-full bg-muted/5 overflow-hidden">
                    <OmniPreview item={activeItem} />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </DialogContent>
      </Dialog>
    </Command>
  )
}
