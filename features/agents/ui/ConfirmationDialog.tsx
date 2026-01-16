'use client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Check,
  X,
  AlertCircle,
  ArrowRight,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useAgent, useAgentsStore } from '@/features/agents'
import { toast } from 'sonner'
import { useScopeStore } from '@/features/scopes'

export function ConfirmationDialog() {
  const { proposedChanges, setProposedChanges, selectedAgentId } =
    useAgentsStore()
  const { items, addItem, updateItem } = useStore()
  const { runAgent, isLoading } = useAgent()
  const { activeScope } = useScopeStore()

  if (!proposedChanges || proposedChanges.length === 0) return null

  const handleCancel = () => setProposedChanges(null)

  const handleConfirm = async () => {
    if (!selectedAgentId) return

    const toastId = toast.loading('Применение изменений...')
    try {
      // Мы отправляем тот же запрос, но с флагом forceExecute
      // В реальной системе мы могли бы отправлять конкретные ID команд,
      // но forceExecute - самый простой способ довести цепочку до конца.
      const predefinedCommands = proposedChanges.map((change) => ({
        domain: change.domain,
        tool: change.tool,
        payload: change.input_payload,
      }))

      // --- OPTIMISTIC UPDATE ---
      proposedChanges.forEach((change) => {
        const tool = change.tool.toUpperCase()
        if (tool === 'CREATE_ITEMS') {
          const itemsToCreate = Array.isArray(change.input_payload)
            ? change.input_payload
            : change.input_payload.items || [change.input_payload]
          itemsToCreate.forEach((item: any) => {
            addItem({
              ...item,
              id: item.id || crypto.randomUUID(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user_id: '',
              status: item.status || 'inbox',
              priority: item.priority || 'medium',
            } as any)
          })
        } else if (tool === 'UPDATE_ITEM') {
          updateItem(change.input_payload as any)
        } else if (tool === 'DELETE_ITEMS' || tool === 'TRASH_ITEMS') {
          const ids = change.input_payload.ids || []
          ids.forEach((id: string) => useStore.getState().removeItem(id))
        }
      })

      await runAgent(selectedAgentId, {
        query: '(применяю подтвержденные изменения)',
        forceExecute: true,
        predefinedCommands,
        scope: activeScope?.slug || 'general',
        scopeId: activeScope?.id,
      } as any)

      toast.success('Изменения успешно применены', { id: toastId })
      setProposedChanges(null)
    } catch (e: any) {
      toast.error(`Ошибка при применении: ${e.message}`, { id: toastId })
    }
  }

  return (
    <Dialog
      open={!!proposedChanges}
      onOpenChange={(open) => !open && handleCancel()}
    >
      <DialogContent className="max-w-3xl bg-card border-border rounded-2xl shadow-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <AlertCircle className="text-primary size-5" />
            Подтверждение изменений
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {proposedChanges.map((change: any, idx: number) => {
            const tool = change.tool.toUpperCase()
            const payload = change.input_payload

            if (tool === 'UPDATE_ITEM') {
              const original = items.find((i) => i.id === payload.id)
              const hasDiff =
                (payload.content && original?.content !== payload.content) ||
                (payload.description !== undefined &&
                  original?.description !== payload.description) ||
                (payload.status && original?.status !== payload.status) ||
                (payload.priority && original?.priority !== payload.priority)

              return (
                <div
                  key={idx}
                  className="border border-border rounded-xl overflow-hidden bg-muted/20"
                >
                  <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ArrowRight size={10} className="text-primary" />
                      Обновление задачи
                    </div>
                    <div className="text-[10px] font-mono opacity-50 truncate max-w-[200px]">
                      ID: {payload.id?.split('-')[0]}...
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {!hasDiff && !original && (
                      <div className="text-xs text-muted-foreground italic p-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                        Внимание: Исходный элемент не найден в текущем списке.
                      </div>
                    )}

                    {!hasDiff && original && (
                      <div className="text-xs text-muted-foreground italic p-2">
                        Изменений в основных полях не обнаружено (синхронизация
                        метаданных).
                      </div>
                    )}

                    {/* Текст задачи */}
                    {payload.content &&
                      original?.content !== payload.content && (
                        <div className="grid grid-cols-2 gap-4 items-start">
                          <div className="space-y-1">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase">
                              БЫЛО
                            </div>
                            <div className="text-xs bg-destructive/10 text-destructive-foreground/70 p-2 rounded-lg border border-destructive/20 line-through">
                              {original?.content || '(пусто)'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] font-bold text-green-500 uppercase flex items-center gap-1">
                              СТАЛО
                            </div>
                            <div className="text-xs bg-green-500/10 text-green-500 p-2 rounded-lg border border-green-500/20 font-medium">
                              {payload.content}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Описание задачи */}
                    {payload.description !== undefined &&
                      original?.description !== payload.description && (
                        <div className="grid grid-cols-2 gap-4 items-start border-t border-border/50 pt-4">
                          <div className="space-y-1">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase">
                              ОПИСАНИЕ (БЫЛО)
                            </div>
                            <div className="text-[11px] text-muted-foreground/60 p-2 rounded-lg bg-muted/30 italic">
                              {original?.description || '(пусто)'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] font-bold text-green-500 uppercase flex items-center gap-1">
                              СТАЛО
                            </div>
                            <div className="text-[11px] text-green-400 p-2 rounded-lg bg-green-400/5 border border-green-400/10">
                              {payload.description || '(удалено)'}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Статус и Приоритет */}
                    {(payload.status ||
                      payload.priority ||
                      original?.status ||
                      original?.priority) && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                        {payload.status &&
                          original?.status !== payload.status && (
                            <div className="flex items-center gap-1.5 text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full border border-blue-500/20">
                              <span className="opacity-50">Статус:</span>
                              <span className="font-bold underline decoration-blue-500/50">
                                {payload.status}
                              </span>
                            </div>
                          )}
                        {payload.priority &&
                          original?.priority !== payload.priority && (
                            <div className="flex items-center gap-1.5 text-[10px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded-full border border-orange-500/20">
                              <span className="opacity-50">Приоритет:</span>
                              <span className="font-bold underline decoration-orange-500/50">
                                {payload.priority}
                              </span>
                            </div>
                          )}
                      </div>
                    )}

                    {!hasDiff && (
                      <pre className="text-[9px] font-mono opacity-40 bg-black/10 p-2 rounded">
                        {JSON.stringify(payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )
            }

            if (tool === 'CREATE_ITEMS') {
              const newItems = Array.isArray(payload)
                ? payload
                : payload.items || [payload]

              return (
                <div
                  key={idx}
                  className="border border-border rounded-xl p-4 bg-muted/30"
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Создание задач ({newItems.length})
                  </div>
                  <div className="space-y-2">
                    {newItems.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm bg-green-400/5 p-2 rounded-lg border border-green-400/10"
                      >
                        <div className="size-1.5 rounded-full bg-green-400" />
                        <span className="font-medium">
                          {item.content || item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            if (tool === 'DELETE_ITEMS' || tool === 'TRASH_ITEMS') {
              const ids = payload.ids || []
              const itemsToDelete = items.filter((i) => ids.includes(i.id))
              const isPermanent = tool === 'DELETE_ITEMS'

              return (
                <div
                  key={idx}
                  className={cn(
                    'border rounded-xl p-4',
                    isPermanent
                      ? 'border-destructive/20 bg-destructive/10'
                      : 'border-orange-500/20 bg-orange-500/5'
                  )}
                >
                  <div
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2',
                      isPermanent ? 'text-destructive' : 'text-orange-400'
                    )}
                  >
                    <Trash2 size={14} />{' '}
                    {isPermanent ? 'Удаление навсегда' : 'В корзину'} (
                    {ids.length})
                  </div>
                  <div className="space-y-1.5">
                    {itemsToDelete.length > 0 ? (
                      itemsToDelete.map((item, i) => (
                        <div
                          key={i}
                          className="text-xs text-muted-foreground line-through opacity-70"
                        >
                          • {item.content}
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] opacity-40 italic">
                        (Элементы уже удалены или не найдены)
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={idx}
                className="border border-border rounded-xl p-4 bg-muted/30"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {tool}
                </div>
                <pre className="text-[10px] font-mono opacity-60 overflow-x-auto">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            )
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 p-6 pt-4 border-t border-border bg-muted/5">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="rounded-xl"
          >
            Отклонить
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Check size={18} className="mr-2" />
            )}
            Применить изменения
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
