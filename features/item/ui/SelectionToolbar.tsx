'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  X,
  FolderPlus,
  FolderMinus,
  Loader2,
  Trash2,
  MapPin,
  Zap,
  PackagePlus,
} from 'lucide-react'
import { bulkAddTag, bulkRemoveTag, softDeleteItem } from '../model/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useAgent,
  useSystemAgent,
  useAgentsStore,
  AgentSelector,
  ConfirmationDialog,
} from '@/features/agents'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useScopeStore, MoveToScopeButton } from '@/features/scopes'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SelectionToolbar() {
  const supabase = createClient()
  const {
    selectedIds,
    clearSelection,
    updateItem,
    items,
    removeItem,
    addItem,
  } = useStore()
  const [groupName, setGroupName] = useState('')

  const {
    agents,
    selectedAgentId,
    setSelectedAgentId,
    setProposedChanges,
    contextFields,
    setContextFields,
  } = useAgentsStore()
  const architectId = useSystemAgent('architect')
  const { runAgent, isLoading } = useAgent()
  const { activeScope } = useScopeStore()

  useEffect(() => {
    // Если агент не выбран ИЛИ выбранного агента больше нет в списке (например, удален)
    const currentAgentExists = agents.some((a) => a.id === selectedAgentId)
    if ((!selectedAgentId || !currentAgentExists) && architectId) {
      setSelectedAgentId(architectId)
    }
  }, [selectedAgentId, architectId, setSelectedAgentId, agents])

  const applyTraceToStore = (trace: any[]) => {
    trace.forEach((t) => {
      if (t.status !== 'success' && t.status !== 'mocked') return
      const tool = t.tool.toUpperCase()
      const payload = t.input_payload

      if (tool === 'CREATE_ITEMS') {
        const created = Array.isArray(t.output_data)
          ? t.output_data
          : [t.output_data]
        created.forEach((item: any) => addItem(item))
      } else if (tool === 'UPDATE_ITEM') {
        updateItem(payload)
      } else if (tool === 'DELETE_ITEMS' || tool === 'TRASH_ITEMS') {
        const ids = payload.ids || []
        ids.forEach((id: string) => removeItem(id))
      }
    })
  }

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
      toast.error(`Ошибка соединения: ${e}`)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    const isHard = e.shiftKey
    if (
      !confirm(
        `${isHard ? 'Жёстко удалить' : 'В корзину'} ${
          selectedIds.length
        } элем.?`
      )
    )
      return

    // Snapshot for rollback
    const originalItems = items.filter((item) => selectedIds.includes(item.id))

    try {
      // Optimistic
      selectedIds.forEach((id) => removeItem(id))
      clearSelection()

      if (isHard) {
        const { error } = await supabase
          .from('items')
          .delete()
          .in('id', selectedIds)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('items')
          .update({ status: 'deleted' })
          .in('id', selectedIds)
        if (error) throw error
      }
      toast.success(isHard ? 'Удалено навсегда' : 'Перемещено в корзину')
    } catch (e) {
      originalItems.forEach((item) => addItem(item))
      toast.error(`Ошибка при удалении: ${e}`)
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

  const handleAiAction = async () => {
    if (!selectedAgentId) return toast.error('Агент не выбран')

    try {
      const result = await runAgent(selectedAgentId, {
        query: groupName,
        scope: activeScope?.slug || 'general',
        scopeId: activeScope?.id,
        itemIds: selectedIds,
        includeFields: contextFields, // Pass context fields
      })

      const pendingTraces = result.execution_trace.filter(
        (t: any) => t.status === 'pending'
      )
      if (pendingTraces.length > 0) {
        setProposedChanges(pendingTraces)
        // toast('Обнаружены изменения, требующие подтверждения', {
        //   description: 'Нажмите "Применить" в диалоговом окне',
        // })
      } else {
        // --- REACTIVE SYNC FOR AUTO-ACTIONS ---
        applyTraceToStore(result.execution_trace)
        if (result.content) toast.success('Готово!')
      }
      console.log('📥 [VAULT_RESULT_PACKET]:', result)
    } catch (e: any) {
      console.error(e)
      toast.error(`Ошибка связи с мозгом: ${e.message}`)
    }
  }

  const toggleField = (field: string) => {
    if (contextFields.includes(field)) {
      setContextFields(contextFields.filter((f) => f !== field))
    } else {
      setContextFields([...contextFields, field])
    }
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0, x: '-50%' }}
      animate={{ y: 0, opacity: 1, x: '-50%' }}
      exit={{ y: 50, opacity: 0, x: '-50%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="fixed bottom-10 left-1/2 z-50 flex flex-col items-center gap-2"
    >
      <ConfirmationDialog />

      <div className="flex items-center gap-1.5 p-1.5 bg-card border border-border rounded-xl shadow-xl min-w-[600px] w-[90vw] max-w-5xl">
        {/* COUNTER */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-primary font-bold text-sm tabular-nums">
          <span>{selectedIds.length}</span>
        </div>

        <div className="h-4 w-px bg-border/40 mx-1" />

        {/* INPUT & GROUPING */}
        <div className="flex-1 flex items-center gap-1 min-w-0">
          <Input
            placeholder="Что сделать с выделенным?"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 w-full border-none focus-visible:ring-0 placeholder:text-muted-foreground text-sm"
          />

          {/* <div className="flex items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('add')}
              disabled={!groupName.trim() || isLoading}
              className="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-500"
              title="Добавить в группу (Enter)"
            >
              <FolderPlus className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAction('remove')}
              disabled={!groupName.trim() || isLoading}
              className="h-8 w-8 p-0 hover:bg-orange-500/10 hover:text-orange-500"
              title="Убрать из группы (Shift+Enter)"
            >
              <FolderMinus className="size-4" />
            </Button>
          </div> */}
        </div>

        <div className="h-4 w-px bg-border/40 mx-1" />

        {/* AI ACTIONS & SETTINGS */}
        <div className="flex items-center gap-1">
          <AgentSelector />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-lg cursor-pointer',
                  contextFields.length < 4
                    ? 'text-orange-400 bg-orange-400/5'
                    : 'text-muted-foreground'
                )}
                title="Настройка контекста (Токены)"
              >
                <PackagePlus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 overflow-hidden z-110"
              align="end"
            >
              <DropdownMenuLabel className="text-xs uppercase tracking-widest text-muted-foreground">
                Поля для Агента
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { id: 'content', label: 'Заголовок' },
                { id: 'description', label: 'Описание' },
                { id: 'type', label: 'Тип' },
                { id: 'status', label: 'Статус' },
                { id: 'priority', label: 'Приоритет' },
                { id: 'is_quick', label: 'Блиц', checked: false },
              ].map((f) => (
                <DropdownMenuCheckboxItem
                  key={f.id}
                  checked={contextFields.includes(f.id)}
                  onCheckedChange={() => (f.checked ? null : toggleField(f.id))}
                  onSelect={(e) => e.preventDefault()}
                >
                  {f.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs opacity-40 leading-tight">
                Меньше полей = быстрее ответ и меньше расход токенов.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleAiAction}
            disabled={isLoading}
            className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-500 hover:bg-violet-500 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Запустить Агента"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Zap className="size-4" />
            )}
          </Button>
        </div>

        <div className="h-4 w-px bg-border/40 mx-1" />

        {/* MANUAL TOOLS */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <MoveToScopeButton selectedIds={selectedIds} />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isLoading}
            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            title="Клик: В корзину, Shift+Клик: Удалить навсегда"
          >
            <Trash2 className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            className="h-8 w-8 rounded-lg hover:bg-muted cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
