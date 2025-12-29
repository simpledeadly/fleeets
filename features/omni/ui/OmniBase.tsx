'use client'

import { useEffect } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { useStore } from '@/lib/store'
import { useOmniStore } from '../model/store'
import { useOmniFilter } from '../model/useOmniFilter'
import { FilterBar } from './FilterBar'
import { OmniChat } from './OmniChat'
import { OmniItem } from './OmniItem'
import { OmniPreview } from './OmniPreview'
import { useCmdkObserver } from '../model/useCmdkObserver'
import { softDeleteItem, updateItem } from '@/features/item'
import { toast } from 'sonner'

interface OmniBaseProps {
  mode: 'standalone' | 'modal'
}

export function OmniBase({ mode }: OmniBaseProps) {
  const {
    setFocusItem,
    items,
    updateItem: updateStoreItem,
    removeItem: removeStoreItem,
    addItem: addStoreItem,
  } = useStore()
  const { isPaletteOpen, closePalette, layout, setLayout } = useOmniStore()

  // В standalone моде мы всегда считаем палитру "открытой" для работы обзервера
  const activeItem = useCmdkObserver(
    mode === 'standalone' ? true : isPaletteOpen
  )

  const filter = useOmniFilter()
  const isAiMode = filter.searchQuery.startsWith('?')

  const handleLayoutChange = (sizes: number[]) => {
    if (!isAiMode && sizes.length === 2) setLayout(sizes)
  }

  const run = (action: () => void) => {
    if (mode === 'modal') closePalette()
    action()
  }

  // 👇 Логика горячих клавиш (оставляем твою)
  useEffect(() => {
    if (mode === 'modal' && !isPaletteOpen) return

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
  }, [isPaletteOpen, items, mode])

  return (
    <div className={mode === 'modal' ? 'h-full' : 'h-screen'}>
      <ResizablePanelGroup
        direction="horizontal"
        className="border-none"
        onLayout={handleLayoutChange}
      >
        <ResizablePanel defaultSize={layout[0]} minSize={30}>
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            {isAiMode ? (
              <OmniChat initialQuery={filter.searchQuery} />
            ) : (
              <Command shouldFilter={false} className="h-full bg-transparent">
                <CommandInput
                  placeholder="Искать в Хранилище..."
                  value={filter.searchQuery}
                  onValueChange={filter.setSearchQuery}
                />
                <FilterBar {...filter} />
                <CommandList
                  className={
                    mode === 'modal' ? 'max-h-130' : 'max-h-none flex-1 pb-10'
                  }
                >
                  <CommandGroup
                    heading={`Элементы (${filter.visibleItems.length})`}
                  >
                    {filter.visibleItems.map((item) => (
                      <OmniItem
                        key={item.id}
                        item={item}
                        onSelect={() => run(() => setFocusItem(item))}
                      />
                    ))}
                  </CommandGroup>
                  <CommandEmpty className="flex items-center justify-center text-muted-foreground text-sm h-30">Ничего не найдено</CommandEmpty>
                </CommandList>
              </Command>
            )}
          </div>
        </ResizablePanel>

        {!isAiMode && (
          <>
            <ResizableHandle withHandle className="bg-border/40" />
            <ResizablePanel
              defaultSize={layout[1]}
              minSize={30}
              className="hidden md:block"
            >
              <div className="h-full w-full bg-muted/5">
                <OmniPreview item={activeItem} />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
