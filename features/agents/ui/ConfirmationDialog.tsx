'use client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, X, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useAgent, useAgentsStore } from '@/features/agents'
import { toast } from 'sonner'
import { useScopeStore } from '@/features/scopes'

export function ConfirmationDialog() {
  const { proposedChanges, setProposedChanges, selectedAgentId } =
    useAgentsStore()
  const { items } = useStore()
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
      <DialogContent className="max-w-2xl bg-card border-border rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <AlertCircle className="text-primary size-5" />
            Подтверждение изменений
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {proposedChanges.map((change: any, idx: number) => {
            const tool = change.tool
            const payload = change.input_payload

            if (tool === 'UPDATE_ITEM') {
              const original = items.find((i) => i.id === payload.id)
              return (
                <div
                  key={idx}
                  className="border border-border rounded-xl p-4 bg-muted/30"
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Обновление задачи
                  </div>
                  <div className="space-y-3">
                    {payload.content &&
                      original?.content !== payload.content && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            ТЕКСТ
                          </span>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="line-through text-muted-foreground bg-destructive/10 px-1 rounded">
                              {original?.content}
                            </span>
                            <ArrowRight
                              size={14}
                              className="text-muted-foreground"
                            />
                            <span className="text-green-400 font-medium bg-green-400/10 px-1 rounded">
                              {payload.content}
                            </span>
                          </div>
                        </div>
                      )}
                    {payload.description &&
                      original?.description !== payload.description && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            ОПИСАНИЕ
                          </span>
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="text-xs text-muted-foreground italic line-through">
                              {original?.description || '(пусто)'}
                            </div>
                            <div className="text-green-400/90">
                              {payload.description}
                            </div>
                          </div>
                        </div>
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

        <DialogFooter className="gap-2 sm:gap-0">
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
