'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  X,
  FolderPlus,
  FolderMinus,
  Loader2,
  Trash2,
  Tag,
  Wand2,
} from 'lucide-react'
import {
  bulkAddTag,
  bulkRemoveTag,
  softDeleteItem,
  suggestGroupForItems,
} from '../model/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function SelectionToolbar() {
  const {
    selectedIds,
    clearSelection,
    updateItem,
    items,
    removeItem,
    addItem,
  } = useStore()
  const [groupName, setGroupName] = useState('')
  const [isPending, setIsPending] = useState(false)

  // Получаем список всех уникальных существующих групп
  const existingGroups = Array.from(
    new Set(
      items
        .flatMap((i) => i.ai_tags || [])
        .filter((t) => t.startsWith('group:'))
        .map((t) => t.replace('group:', ''))
    )
  ).sort()

  const handleAction = async (action: 'add' | 'remove', name?: string) => {
    const finalName = name || groupName.trim()
    if (!finalName) {
      toast.error('Введите название группы')
      return
    }

    const tag = `group:${finalName}`

    // 1. Snapshot for rollback
    const originalItems = selectedIds
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean) as any[]

    // 2. Optimistic Update
    selectedIds.forEach((id) => {
      const item = items.find((i) => i.id === id)
      if (item) {
        const newTags =
          action === 'add'
            ? Array.from(new Set([...(item.ai_tags || []), tag]))
            : (item.ai_tags || []).filter((t: string) => t !== tag)

        updateItem({ ...item, ai_tags: newTags })
      }
    })

    if (!name) setGroupName('')

    try {
      const result =
        action === 'add'
          ? await bulkAddTag(selectedIds, tag)
          : await bulkRemoveTag(selectedIds, tag)

      if (!result.success) {
        // 3. Rollback on failure
        originalItems.forEach((item) => updateItem(item))
        toast.error(result.error || 'Ошибка на сервере')
      } else {
        toast.success(
          action === 'add' ? `Добавлено: ${finalName}` : `Удалено: ${finalName}`
        )
      }
    } catch (e) {
      originalItems.forEach((item) => updateItem(item))
      toast.error('Ошибка соединения')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Удалить выбранные элементы (${selectedIds.length})?`)) return

    // 1. Snapshot
    const originalSelectedIds = [...selectedIds]
    const originalItems = originalSelectedIds
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean) as any[]

    // 2. Optimistic Update (Instant Removal)
    originalSelectedIds.forEach((id) => removeItem(id))
    clearSelection()

    try {
      // 3. Background call
      const deletePromises = originalSelectedIds.map((id) => softDeleteItem(id))
      const results = await Promise.all(deletePromises)

      const failed = results.some((r) => 'error' in r)
      if (failed) {
        // Rollback: Re-add items to store if some failed
        originalItems.forEach((item) => addItem(item))
        toast.error('Не удалось удалить некоторые элементы на сервере')
      } else {
        toast.success('Удалено')
      }
    } catch (e) {
      // Full Rollback
      originalItems.forEach((item) => addItem(item))
      toast.error('Ошибка при удалении')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) handleAction('remove')
      else handleAction('add')
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const roots = document.querySelectorAll('[cmdk-root]')
      const omniRoot = roots[roots.length - 1]
      if (omniRoot) {
        const event = new KeyboardEvent('keydown', {
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          bubbles: true,
          cancelable: true,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
        })
        omniRoot.dispatchEvent(event)
      }
    }
    if (e.key === 'Escape') clearSelection()
  }

  const handleMagic = async () => {
    setIsPending(true)
    const selectedItems = selectedIds
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean) as any[]

    const contents = selectedItems.map((i) => i.content)

    try {
      const result = await suggestGroupForItems(contents)
      if (result.success && result.group) {
        setGroupName(result.group)
        toast.success(`Предложено: ${result.group}`)
      } else {
        toast.error(result.error || 'Не удалось подобрать группу')
      }
    } catch (e) {
      toast.error('Ошибка AI')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0, x: '-50%' }}
      animate={{ y: 0, opacity: 1, x: '-50%' }}
      exit={{ y: 50, opacity: 0, x: '-50%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="absolute bottom-10 left-1/2 z-150 flex flex-col items-center gap-2"
    >
      {/* Список существующих групп для быстрого выбора */}
      {existingGroups.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-md p-1 bg-background/40 backdrop-blur-xl border border-border/50 rounded-full mb-1 pb-1">
          {existingGroups.map((group) => (
            <button
              key={group}
              onClick={() =>
                setGroupName((prev) => (prev === group ? '' : group))
              }
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                groupName === group
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {group}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 p-1 bg-background/60 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl">
        {/* Счетчик */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-primary/10 rounded-xl text-primary font-mono text-sm font-bold ml-0.5 tabular-nums">
          <span>{selectedIds.length}</span>
        </div>

        <div className="h-6 w-px bg-border/40 mx-1" />

        {/* Группировка */}
        <div className="flex items-center gap-1 group/input">
          <Input
            placeholder="Группа..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-8 w-32 bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/40 text-sm transition-all group-focus-within/input:w-40"
          />

          <div className="flex items-center gap-0.5 ml-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('add')}
              disabled={!groupName.trim() || isPending}
              className="h-8 w-8 p-0 rounded-full hover:bg-primary/20 hover:text-green-400 cursor-pointer"
              title="Добавить в группу (Enter)"
            >
              <FolderPlus className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('remove')}
              disabled={!groupName.trim() || isPending}
              className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="Убрать из группы (Shift+Enter)"
            >
              <FolderMinus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="h-6 w-px bg-border/40 mx-1" />

        {/* Быстрые действия */}
        <div className="flex items-center gap-0.5 duration-150 text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMagic}
            disabled={isPending}
            className="h-8 w-8 p-0 rounded-full hover:bg-violet-500/20 hover:text-violet-500 cursor-pointer transition-all"
            title="Авто-группировка (AI)"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
          </Button>

          <div className="h-6 w-px bg-border/40 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isPending}
            className="h-8 w-8 p-0 rounded-full hover:bg-primary/20 hover:text-destructive cursor-pointer"
            title="Удалить выбранное"
          >
            <Trash2 className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            className="h-8 w-8 p-0 rounded-full hover:bg-primary/20 hover:text-primary cursor-pointer"
            title="Отмена"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
