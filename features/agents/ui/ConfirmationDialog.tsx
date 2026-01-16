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
  Folders,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useAgent, useAgentsStore } from '@/features/agents'
import { toast } from 'sonner'
import { useScopeStore } from '@/features/scopes'
import {
  FolderOutput,
  StickyNote,
  CheckCircle2,
  Clock,
  LayoutGrid,
} from 'lucide-react'

// --- HELPER COMPONENTS ---

function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider',
        className
      )}
    >
      {children}
    </div>
  )
}

function ItemPreviewCard({
  item,
  title,
  icon: Icon,
  variant = 'default',
  diffFields = [],
}: {
  item: any
  title: string
  icon: any
  variant?: 'default' | 'success' | 'destructive' | 'warning'
  diffFields?: string[]
}) {
  const { scopes } = useScopeStore()
  const scopeName = scopes.find((s) => s.id === item.scope_id)?.name || 'Inbox'

  const variants = {
    default: 'border-border bg-muted',
    success: 'border-green-500/20 bg-green-500/10',
    destructive: 'border-destructive/20 bg-destructive/10',
    warning: 'border-orange-500/20 bg-orange-500/10',
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden', variants[variant])}>
      <div className="px-3 py-1.5 border-b border-inherit bg-inherit/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="opacity-70" />
          <span className="text-xs font-bold uppercase tracking-widest opacity-70">
            {title}
          </span>
        </div>
        {item.type && (
          <Badge className="bg-primary/10 text-primary">{item.type}</Badge>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div
          className={cn(
            'text-sm font-semibold',
            diffFields.includes('content') && 'text-green-500'
          )}
        >
          {item.content || '(без заголовка)'}
        </div>
        {(item.description || diffFields.includes('description')) && (
          <div
            className={cn(
              'text-xs text-muted-foreground line-clamp-2 italic',
              diffFields.includes('description') && 'text-green-400'
            )}
          >
            {item.description || '(нет описания)'}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card px-1.5 py-0.5 rounded border border-border/10">
            <Folders size={16} /> {scopeName}
          </div>
          {item.status && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border border-border/10',
                item.status === 'done'
                  ? 'text-green-400 bg-green-400/10'
                  : 'text-blue-400 bg-blue-400/10'
              )}
            >
              <CheckCircle2 size={16} /> {item.status}
            </div>
          )}
          {item.priority && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border border-border/10',
                item.priority === 'high'
                  ? 'text-orange-400 bg-orange-400/10'
                  : 'text-muted-foreground bg-card'
              )}
            >
              <Clock size={16} /> {item.priority}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
              user_id: '', // Supabase uses auth uid automatically on server, but store might want it
              status: item.status || 'inbox',
              triaged_at:
                (item.status || 'inbox') !== 'inbox'
                  ? new Date().toISOString()
                  : null,
              priority: item.priority || 'medium',
              scope_id: item.scope_id || activeScope?.id,
            } as any)
          })
        } else if (tool === 'UPDATE_ITEM') {
          updateItem(change.input_payload as any)
        } else if (tool === 'DELETE_ITEMS' || tool === 'TRASH_ITEMS') {
          const ids = change.input_payload.ids || []
          ids.forEach((id: string) => useStore.getState().removeItem(id))
        } else if (tool === 'MOVE_ITEMS') {
          const ids = change.input_payload.ids || []
          const targetScopeId = change.input_payload.target_scope_id
          ids.forEach((id: string) => {
            const original = items.find((i) => i.id === id)
            if (original) {
              updateItem({ ...original, scope_id: targetScopeId })
            }
          })
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
              const diffFields = []
              if (payload.content && original?.content !== payload.content)
                diffFields.push('content')
              if (
                payload.description !== undefined &&
                original?.description !== payload.description
              )
                diffFields.push('description')

              return (
                <div key={idx} className="space-y-2">
                  <ItemPreviewCard
                    item={{ ...original, ...payload }}
                    title="Обновление задачи"
                    icon={ArrowRight}
                    variant="success"
                    diffFields={diffFields}
                  />
                  {/* Small detail view for specific metadata changes if any */}
                  {(payload.status && original?.status !== payload.status) ||
                  (payload.priority &&
                    original?.priority !== payload.priority) ? (
                    <div className="flex gap-2 ml-4">
                      {payload.status &&
                        original?.status !== payload.status && (
                          <div className="text-xs text-blue-400 bg-blue-400/5 px-2 py-0.5 rounded border border-blue-400/10">
                            {original?.status || 'unset'} → {payload.status}
                          </div>
                        )}
                      {payload.priority &&
                        original?.priority !== payload.priority && (
                          <div className="text-xs text-orange-400 bg-orange-400/5 px-2 py-0.5 rounded border border-orange-400/10">
                            {original?.priority || 'unset'} → {payload.priority}
                          </div>
                        )}
                    </div>
                  ) : null}
                </div>
              )
            }

            if (tool === 'CREATE_ITEMS') {
              const newItems = Array.isArray(payload)
                ? payload
                : payload.items || [payload]
              return (
                <div key={idx} className="space-y-3">
                  {newItems.map((item: any, i: number) => (
                    <ItemPreviewCard
                      key={i}
                      item={item}
                      title="Новая задача"
                      icon={AlertCircle}
                      variant="success"
                    />
                  ))}
                </div>
              )
            }

            if (tool === 'DELETE_ITEMS' || tool === 'TRASH_ITEMS') {
              const ids = payload.ids || []
              const itemsToDelete = items.filter((i) => ids.includes(i.id))
              const isPermanent = tool === 'DELETE_ITEMS'
              return (
                <div key={idx} className="space-y-3">
                  {itemsToDelete.map((item, i) => (
                    <ItemPreviewCard
                      key={i}
                      item={item}
                      title={isPermanent ? 'Постоянное удаление' : 'В корзину'}
                      icon={Trash2}
                      variant={isPermanent ? 'destructive' : 'warning'}
                    />
                  ))}
                  {itemsToDelete.length === 0 && (
                    <div className="p-4 border border-dashed rounded-xl text-center text-xs text-muted-foreground opacity-50">
                      ID для удаления не найдены (возможно уже удалено)
                    </div>
                  )}
                </div>
              )
            }

            if (tool === 'MOVE_ITEMS') {
              const ids = payload.ids || []
              const targetScopeId = payload.target_scope_id
              const itemsToMove = items.filter((i) => ids.includes(i.id))
              const targetScopeName =
                useScopeStore
                  .getState()
                  .scopes.find((s) => s.id === targetScopeId)?.name || 'Inbox'

              return (
                <div key={idx} className="space-y-3">
                  <div className="text-xs font-bold text-primary flex items-center gap-2 px-2">
                    <FolderOutput size={18} /> Перенос в: {targetScopeName}
                  </div>
                  {itemsToMove.map((item, i) => (
                    <ItemPreviewCard
                      key={i}
                      item={item}
                      title="Перенос"
                      icon={FolderOutput}
                      variant="default"
                    />
                  ))}
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
                <pre className="text-xs font-mono opacity-60 overflow-x-auto">
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
            className="rounded-xl cursor-pointer mr-2"
          >
            Отклонить
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check size={18} />
            )}
            Применить изменения
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
