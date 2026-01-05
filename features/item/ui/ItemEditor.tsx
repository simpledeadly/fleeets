'use client'
import { Item, useStore } from '@/lib/store'
import { useItemActions } from '../model/useItemActions'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  Fingerprint,
  Sparkles,
  Trash2,
  CheckCircle2,
  FileText,
  Lightbulb,
  FileBox,
  Inbox,
  ListTodo,
  Focus,
  Archive,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// Конфиги для кнопок
const TYPES = [
  { id: 'task', icon: CheckCircle2, label: 'Task' },
  { id: 'note', icon: FileText, label: 'Note' },
  { id: 'thought', icon: Lightbulb, label: 'Thought' },
  { id: 'resource', icon: FileBox, label: 'Resource' },
]

const STATUSES = [
  { id: 'inbox', icon: Inbox, label: 'Inbox' },
  { id: 'planned', icon: ListTodo, label: 'Planned' },
  { id: 'today', icon: Focus, label: 'Today' },
  { id: 'done', icon: CheckCircle2, label: 'Done' },
  { id: 'archived', icon: Archive, label: 'Archived' },
]

const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
]

export function ItemEditor() {
  const editingItem = useStore((state) => state.editingItem)
  // Находим этот же айтем в основном массиве items, чтобы иметь свежие данные после загрузки БД
  const liveItem = useStore((state) =>
    state.items.find((i) => i.id === editingItem?.id)
  )

  const setEditingItem = useStore((state) => state.setEditingItem)
  const [displayItem, setDisplayItem] = useState<Item | null>(null)

  useEffect(() => {
    const activeItem = liveItem || editingItem
    if (activeItem) {
      const t = setTimeout(() => setDisplayItem(activeItem), 0)
      return () => clearTimeout(t)
    }
  }, [liveItem, editingItem])

  const actions = useItemActions(editingItem!)

  if (!displayItem && !editingItem) return null

  return (
    <Sheet
      open={!!editingItem}
      onOpenChange={(open) => !open && setEditingItem(null)}
    >
      <SheetContent
        onAnimationEndCapture={() => !editingItem && setDisplayItem(null)}
        className="min-w-screen md:min-w-md p-0 bg-card flex flex-col gap-0 border-l border-border overflow-y-auto custom-scrollbar"
      >
        <SheetHeader className="flex flex-row justify-between items-center p-1.5 px-3 border-b border-border shrink-0">
          <SheetTitle className="text-lg font-bold tracking-tight">
            {displayItem ? (
              'Инспектор'
            ) : (
              <VisuallyHidden.Root>Инспектор</VisuallyHidden.Root>
            )}
          </SheetTitle>
          <div className="flex gap-1 mr-8">
            <button
              onClick={() => actions.vectorize()}
              className="p-2 hover:bg-primary/10 rounded-full text-primary cursor-pointer"
            >
              <Fingerprint size={18} />
            </button>
            <button
              onClick={() => actions.refine()}
              className="p-2 hover:bg-secondary rounded-full text-amber-500 cursor-pointer"
            >
              <Sparkles size={18} />
            </button>
            <button
              onClick={() => actions.remove()}
              className="p-2 hover:bg-destructive/10 rounded-full text-destructive cursor-pointer"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </SheetHeader>

        {displayItem && (
          <div className="flex-1 px-3 py-4 space-y-8 pb-20">
            {/* Заголовок и описания */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                  Заголовок
                </span>
                <Input
                  key={`title-${displayItem.id}`}
                  defaultValue={displayItem.content}
                  onBlur={(e) => actions.update({ content: e.target.value })}
                  className="border-none bg-secondary/30 text-md font-medium focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>
              {/* Описание и Исходный текст */}
              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                  Описание
                </span>
                <Textarea
                  key={`desc-${displayItem.id}`}
                  defaultValue={displayItem.description || ''}
                  onBlur={(e) =>
                    actions.update({ description: e.target.value })
                  }
                  className="border-none bg-secondary/30 min-h-24 resize-none focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                  Исходный текст
                </span>
                <Textarea
                  key={`raw-${displayItem.id}`}
                  defaultValue={displayItem.raw_content || ''}
                  onBlur={(e) =>
                    actions.update({ raw_content: e.target.value })
                  }
                  className="border-none bg-secondary/30 min-h-24 resize-none focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Тип (Кнопки) */}
            <div className="space-y-1.5">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                Тип
              </span>
              <div className="flex gap-1 rounded-lg bg-secondary/30 p-1">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => actions.update({ type: t.id as any })}
                    className={cn(
                      'flex-1 flex flex-col items-center justify-center py-2 rounded-md transition-all duration-150 cursor-pointer',
                      displayItem.type === t.id
                        ? 'bg-primary text-primary-foreground shadow-none'
                        : 'text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    <t.icon size={18} />
                    <span className="text-xs mt-1 font-bold uppercase tracking-tighter">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Статус (Кнопки) */}
            <div className="space-y-1.5">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                Статус
              </span>
              <div className="grid grid-cols-5 gap-1 rounded-lg bg-secondary/30 p-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => actions.update({ status: s.id as any })}
                    className={cn(
                      'flex flex-col items-center justify-center py-2 rounded-md transition-all duration-150 cursor-pointer',
                      displayItem.status === s.id
                        ? 'bg-primary text-primary-foreground shadow-none'
                        : 'text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    <s.icon size={16} />
                    <span className="text-xs mt-1 font-bold uppercase tracking-tighter">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Приоритет и БЛИЦ */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                  Приоритет
                </span>
                <div className="flex gap-1 rounded-lg bg-secondary/30 p-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => actions.update({ priority: p.id as any })}
                      className={cn(
                        'flex-1 py-1.5 rounded-md text-xs font-bold uppercase transition-all duration-150 cursor-pointer',
                        displayItem.priority === p.id
                          ? 'bg-primary text-primary-foreground shadow-none'
                          : 'text-muted-foreground hover:bg-secondary'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 w-24">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                  Режим
                </span>
                <button
                  onClick={() =>
                    actions.update({ is_quick: !displayItem.is_quick })
                  }
                  className={cn(
                    'w-full flex flex-col items-center justify-center py-2 rounded-lg border transition-all duration-150 cursor-pointer',
                    displayItem.is_quick
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                      : 'bg-secondary/30 hover:bg-secondary border-transparent text-muted-foreground'
                  )}
                >
                  <Zap
                    size={18}
                    className={displayItem.is_quick ? 'fill-current' : ''}
                  />
                  <span className="text-xs mt-1 font-bold tracking-widest">
                    БЛИЦ
                  </span>
                </button>
              </div>
            </div>

            {/* Лог выполнения */}
            <div className="space-y-1.5">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                Лог выполнения
              </span>
              <Textarea
                key={`log-${displayItem.id}`}
                defaultValue={displayItem.execution_log || ''}
                onBlur={(e) =>
                  actions.update({ execution_log: e.target.value })
                }
                className="bg-secondary/20 border-none font-mono text-xs min-h-32 focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
