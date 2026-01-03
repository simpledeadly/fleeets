'use client'
import { useStore } from '@/lib/store'
import { useItemActions } from '../model/useItemActions'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Fingerprint, Sparkles, Trash2 } from 'lucide-react'

export function ItemEditor() {
  const item = useStore((state) => state.editingItem)
  const setEditingItem = useStore((state) => state.setEditingItem)
  const actions = useItemActions(item!)

  if (!item) return null

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && setEditingItem(null)}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col gap-0 border-l border-border overflow-y-auto">
        <SheetHeader className="flex flex-row justify-between items-center p-3 border-b border-border">
          <SheetTitle className="text-lg font-bold tracking-tight">
            Инспектор
          </SheetTitle>

          <div className="flex gap-1 mr-8">
            <button
              onClick={() => actions.vectorize()}
              className="p-2 hover:bg-primary/10 rounded-full transition-colors text-primary cursor-pointer"
              title="Обновить вектор в базе знаний"
            >
              <Fingerprint size={18} />
            </button>

            <button
              onClick={() => actions.refine()}
              className="p-2 hover:bg-secondary rounded-full transition-colors text-amber-500 cursor-pointer"
            >
              <Sparkles size={18} />
            </button>

            <button
              onClick={() => actions.remove()}
              className="p-2 hover:bg-destructive/10 rounded-full transition-colors text-destructive cursor-pointer"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 px-3 py-2">
          <div className="space-y-8 pb-12">
            {/* Группа: Контент */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                  Заголовок
                </span>
                <Input
                  key={`title-${item.id}`}
                  defaultValue={item.content}
                  onBlur={(e) => actions.update({ content: e.target.value })}
                  className="border-none bg-secondary/30 text-md font-medium focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest pl-1">
                  Описание
                </span>
                <Textarea
                  key={`desc-${item.id}`}
                  defaultValue={item.description || ''}
                  onBlur={(e) =>
                    actions.update({ description: e.target.value })
                  }
                  className="border-none bg-secondary/30 min-h-32 resize-none focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Группа: Мета */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground pl-1">
                  Тип
                </span>
                <Select
                  value={item.type!}
                  onValueChange={(v: any) => actions.update({ type: v })}
                >
                  <SelectTrigger className="bg-secondary/30 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="thought">Thought</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground pl-1">
                  Статус
                </span>
                <Select
                  value={item.status!}
                  onValueChange={(v: any) => actions.update({ status: v })}
                >
                  <SelectTrigger className="bg-secondary/30 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbox">Inbox</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Группа: Приоритет и Блиц */}
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <span className="text-xs uppercase font-bold text-muted-foreground pl-1">
                  Приоритет
                </span>
                <Select
                  value={String(item.priority || 'medium')}
                  onValueChange={(v: any) => actions.update({ priority: v })}
                >
                  <SelectTrigger className="bg-secondary/30 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 bg-secondary/30 px-4 h-10 rounded-md border border-transparent">
                <Switch
                  checked={item.is_quick!}
                  onCheckedChange={(v) => actions.update({ is_quick: v })}
                />
                <span className="text-xs font-bold text-muted-foreground">
                  БЛИЦ
                </span>
              </div>
            </div>

            {/* Исходник и Лог */}
            <div className="space-y-1.5">
              <span className="text-xs uppercase font-bold text-muted-foreground pl-1">
                Execution Log
              </span>
              <Textarea
                key={`log-${item.id}`}
                defaultValue={item.execution_log || ''}
                onBlur={(e) =>
                  actions.update({ execution_log: e.target.value })
                }
                className="bg-secondary/20 border-none font-mono text-[11px] min-h-40"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
