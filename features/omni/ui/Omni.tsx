'use client'

import { useEffect } from 'react'
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
import { Layers, Focus } from 'lucide-react'

// Импорт декомпозированных частей
import { useOmniFilter } from '../model/useOmniFilter'
import { FilterBar } from './FilterBar'
import { OmniChat } from './OmniChat'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { OmniTaskItem } from './OmniTaskItem'
import { toast } from 'sonner'
import { softDeleteItem, updateItem } from '@/features/item'

export function Omni() {
  const {
    setFocusItem,
    setView,
    items,
    updateItem: updateStoreItem, // <--- Alias
    removeItem: removeStoreItem, // <--- Alias
    addItem: addStoreItem, // <--- Alias
  } = useStore()
  const { isPaletteOpen, closePalette } = useOmniStore()

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
                        <Layers className="h-4 w-4" />
                        Инбокс
                      </CommandItem>
                      <CommandItem onSelect={() => run(() => setView('focus'))}>
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
                    <OmniTaskItem
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
        </DialogContent>
      </Dialog>
    </Command>
  )
}
