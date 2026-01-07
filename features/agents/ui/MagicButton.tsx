import { BrainCog, Loader2 } from 'lucide-react'
import { useAgent } from '../hooks/useAgent'
import { toast } from 'sonner'

export const MagicButton = ({
  itemId,
  agentId,
}: {
  itemId: string
  agentId: string
}) => {
  const { runAgent, isLoading } = useAgent()

  const handleAction = async () => {
    try {
      const result = await runAgent(itemId, agentId)
      console.log('🚀 [AGENT_RESULT]:', result)

      toast.success(`Агент выполнил: ${result.intent}`, {
        description: result.content?.substring(0, 100) + '...',
        action: {
          label: 'Log',
          onClick: () => console.table(result),
        },
      })
    } catch (e) {
      toast.error(`Сбой агента. Ошибка: ${e}`)
    }
  }

  return (
    <button
      onClick={handleAction}
      disabled={isLoading}
      className="p-2 rounded-full text-muted-foreground hover:bg-muted  hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
    >
      {isLoading ? (
        <Loader2 strokeWidth={1.6} size={22} className="animate-spin" />
      ) : (
        <BrainCog strokeWidth={1.6} size={22} />
      )}
    </button>
  )
}
