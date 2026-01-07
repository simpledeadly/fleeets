// features/agents/ui/PlaygroundDebug.tsx

import { AgentSessionResult } from '@/features/agents'

const Section = ({
  title,
  content,
  color,
}: {
  title: string
  content: string
  color: string
}) => (
  <div className="space-y-1">
    <span className={`text-[9px] uppercase font-bold ${color}`}>{title}</span>
    <pre className="p-2 bg-card rounded border border-border text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
      {content}
    </pre>
  </div>
)

export function PlaygroundDebug({ result }: { result: AgentSessionResult }) {
  return (
    <div className="space-y-4">
      <Section
        title="System Prompt"
        content={result.debug.full_system_prompt}
        color="text-blue-400"
      />
      <Section
        title="User Prompt"
        content={result.debug.full_user_prompt}
        color="text-purple-400"
      />
      <Section
        title="AI Response"
        content={result.debug.raw_ai_response}
        color="text-orange-400"
      />
    </div>
  )
}
