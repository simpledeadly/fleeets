'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { cn } from '@/lib/utils'
import { useHotkeys } from '@/lib/hooks'
import { SelectionToolbar } from '@/features/item'

interface OmniBaseProps {
  mode: 'standalone' | 'modal'
}

export function OmniBase({ mode }: OmniBaseProps) {
  const {
    updateItem: updateStoreItem,
    removeItem: removeStoreItem,
    addItem: addStoreItem,
    selectedIds,
    toggleSelection,
    clearSelection,
  } = useStore()
  const setFocusItem = useStore((state) => state.setFocusItem)
  const items = useStore((state) => state.items)

  const isPaletteOpen = useOmniStore((state) => state.isPaletteOpen)
  const closePalette = useOmniStore((state) => state.closePalette)
  const layout = useOmniStore((state) => state.layout)
  const setLayout = useOmniStore((state) => state.setLayout)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isReady, setIsReady] = useState(mode === 'modal')

  // 👇 Эффект: Возвращаем фокус в инпут при закрытии модалки (focusItem -> null)
  // 👇 Эффект: Возвращаем фокус в инпут при закрытии модалки ИЛИ при очистке выделения
  const focusItem = useStore((state) => state.focusItem)
  useEffect(() => {
    // Если фокус-айтем пропал (закрыли превью) ИЛИ если мы в режиме ожидания (isReady)
    // фокусим основной инпут
    if (!focusItem && isReady) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [focusItem, isReady])

  // [ROUND 13] Возвращаем фокус в инпут при очистке выделения
  useEffect(() => {
    if (selectedIds.length === 0 && isReady) {
      inputRef.current?.focus()
    }
  }, [selectedIds.length, isReady])

  useEffect(() => {
    if (mode === 'standalone') {
      const timer = setTimeout(() => setIsReady(true), 0)
      return () => clearTimeout(timer)
    }
  }, [mode])

  // В standalone моде мы всегда считаем палитру "открытой" для работы наблюдателя
  const activeItem = useCmdkObserver(
    mode === 'standalone' ? true : isPaletteOpen,
    containerRef.current
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

  // [ROUND 17] Если DOM-наблюдатель еще не увидел выделение (обычно при открытии),
  // берем первый элемент из списка отфильтрованных как фолбек.
  const effectiveActiveItem =
    activeItem ||
    (mode === 'modal' && isPaletteOpen ? filter.visibleItems[0] : null)

  const triggerAction = async (
    action: 'toggleDone' | 'toggleFocused' | 'toggleInbox' | 'delete'
  ) => {
    // ЖЕСТКАЯ изоляция: если мы в фоне и открыто омни — ничего не делаем
    if (mode === 'standalone' && isPaletteOpen) return

    const item = effectiveActiveItem
    if (!item) return

    if (action === 'toggleDone') {
      const newStatus = item.status === 'done' ? 'planned' : 'done'
      const previousItem = { ...item }
      updateStoreItem({ ...item, status: newStatus })
      const undo = async () => {
        updateStoreItem(previousItem)
        await updateItem(item.id, previousItem)
      }
      toast.success(newStatus === 'done' ? 'Завершено' : 'Возвращено', {
        action: { label: 'Отмена', onClick: undo },
      })
      await updateItem(item.id, { status: newStatus })
    }

    if (action === 'toggleFocused') {
      const newStatus = item.status === 'today' ? 'planned' : 'today'
      const previousItem = { ...item }
      updateStoreItem({ ...item, status: newStatus })
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
      await updateItem(item.id, { status: newStatus })
    }

    if (action === 'toggleInbox') {
      const newStatus = item.status === 'inbox' ? item.status : 'inbox'
      const previousItem = { ...item }
      updateStoreItem({ ...item, status: newStatus })
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
      await updateItem(item.id, { status: newStatus })
    }

    if (action === 'delete') {
      const previousItem = { ...item }
      removeStoreItem(item.id)
      const undo = async () => {
        addStoreItem(previousItem)
        await updateItem(item.id, { status: previousItem.status })
      }
      toast.success('Удалено', {
        action: { label: 'Вернуть', onClick: undo },
      })
      await softDeleteItem(item.id)
    }
  }

  // 👇 Логика горячих клавиш
  useHotkeys(
    [
      ['mod+d', () => triggerAction('toggleDone')],
      ['mod+f', () => triggerAction('toggleFocused')],
      ['mod+i', () => triggerAction('toggleInbox')],
      [
        'mod+x',
        () => {
          if (effectiveActiveItem) toggleSelection(effectiveActiveItem.id, true)
        },
      ],
      [
        'Escape',
        () => {
          if (selectedIds.length > 0) clearSelection()
        },
      ],
      ['Delete', () => triggerAction('delete')],
    ],
    {
      enabled: mode === 'standalone' ? !isPaletteOpen : isPaletteOpen,
    }
  )

  // [ROUND 17] Гарантированный фокус при каждом открытии модалки
  useEffect(() => {
    if (mode === 'modal' && isPaletteOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [mode, isPaletteOpen])

  // 👇 Глобальная навигация для Хранилища (standalone)
  useEffect(() => {
    if (mode !== 'standalone' || isPaletteOpen) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Игнорируем, если фокус в инпуте
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement

      if (isInput) return

      // Если нажаты стрелки или j/k — фокусим основной инпут омни,
      // чтобы передать навигацию cmdk (это надежнее ручных кликов)
      if (['ArrowDown', 'ArrowUp', 'j', 'k'].includes(e.key)) {
        // [DEFENSE] Если фокус в любом инпуте (в тулбаре или CaptureBar) — НЕ перехватываем фокус
        if (
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        ) {
          return
        }

        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus()
          // Не прерываем событие, чтобы cmdk его поймал сразу после фокуса
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [mode, isPaletteOpen])

  const isInitialState =
    !filter.searchQuery &&
    !filter.activeStatus &&
    !filter.isQuick &&
    !filter.isTask &&
    !filter.isThought &&
    !filter.isNote &&
    !filter.isResource &&
    filter.activeTags.length === 0

  return (
    <div
      ref={containerRef}
      className={cn(mode === 'modal' ? 'h-full' : 'h-screen', 'relative')}
    >
      <ResizablePanelGroup
        direction="horizontal"
        className="border-none"
        onLayout={handleLayoutChange}
      >
        <ResizablePanel defaultSize={layout[0]} minSize={30}>
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            {isAiMode ? (
              <OmniChat initialQuery={filter.searchQuery} mode={mode} />
            ) : (
              <Command
                key={`${mode}-${isReady}`} // Убрали isPaletteOpen, чтобы фон не ремаунтился и не воровал фокус
                shouldFilter={false}
                className="h-full bg-transparent"
              >
                <CommandInput
                  ref={inputRef}
                  placeholder="Искать в Хранилище..."
                  value={filter.searchQuery}
                  onValueChange={filter.setSearchQuery}
                  autoFocus={mode === 'modal'}
                />

                {mode === 'standalone' && <FilterBar {...filter} />}

                <CommandList
                  className={cn(
                    mode === 'modal'
                      ? 'max-h-130'
                      : 'max-h-none flex-1 pb-25 md:pb-10',
                    'outline-none'
                  )}
                >
                  {!isReady ? (
                    <div className="p-2 space-y-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-2 py-2"
                        >
                          <div className="size-4 rounded-full bg-muted/20 animate-pulse shrink-0" />
                          <div className="h-3 bg-muted/20 animate-pulse rounded-sm w-full max-w-60" />
                        </div>
                      ))}
                    </div>
                  ) : isInitialState ? (
                    <CommandGroup
                      heading={
                        filter.searchQuery
                          ? `Найдено (${filter.visibleItems.length})`
                          : 'Недавние'
                      }
                    >
                      {filter.visibleItems.map((item, index) => (
                        <OmniItem
                          key={`recent-${item.id}`}
                          item={item}
                          opacity={Math.max(0, 1 - index * 0.2)}
                          isSelected={selectedIds.includes(item.id)}
                          onSelect={(multi) => {
                            if (multi) {
                              toggleSelection(item.id, true)
                            } else {
                              run(() => setFocusItem(item))
                            }
                          }}
                        />
                      ))}
                    </CommandGroup>
                  ) : (
                    <>
                      <CommandGroup
                        heading={`Найдено (${filter.visibleItems.length})`}
                      >
                        {filter.visibleItems.map((item) => (
                          <OmniItem
                            key={item.id}
                            item={item}
                            isSelected={selectedIds.includes(item.id)}
                            onSelect={(multi) => {
                              if (multi) {
                                toggleSelection(item.id, true)
                              } else {
                                run(() => setFocusItem(item))
                              }
                            }}
                          />
                        ))}
                      </CommandGroup>
                      <CommandEmpty className="flex items-center justify-center text-muted-foreground text-sm h-20 mb-8">
                        Ничего не найдено
                      </CommandEmpty>
                    </>
                  )}
                </CommandList>
              </Command>
            )}
          </div>
        </ResizablePanel>

        {!isAiMode && mode === 'standalone' && (
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

      <AnimatePresence>
        {selectedIds.length > 0 && (mode === 'modal' || !isPaletteOpen) && (
          <SelectionToolbar />
        )}
      </AnimatePresence>
    </div>
  )
}
