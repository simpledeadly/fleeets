'use client'

import { useAgentsStore } from '../model/store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AgentSelector() {
  const { agents, selectedAgentId, setSelectedAgentId } = useAgentsStore()

  return (
    <Select
      value={selectedAgentId || undefined}
      onValueChange={setSelectedAgentId}
    >
      <SelectTrigger className="h-8 w-[140px] bg-transparent border-none focus:ring-0 text-xs font-medium px-2 gap-2 hover:bg-muted/50 transition-colors rounded-xl">
        <div className="flex items-center gap-1.5 truncate">
          <div className="shrink-0">
            {selectedAgentId ? (
              <div
                className="size-4 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor:
                    agents.find((a) => a.id === selectedAgentId)?.color ||
                    '#3B82F6',
                }}
              >
                <User size={10} className="text-white" />
              </div>
            ) : (
              <Sparkles size={14} className="text-muted-foreground" />
            )}
          </div>
          <SelectValue placeholder="Выбрать агента" />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-md">
        {agents.map((agent) => (
          <SelectItem
            key={agent.id}
            value={agent.id}
            className="rounded-lg text-xs focus:bg-primary/10 focus:text-primary cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div
                className="size-3.5 rounded-full"
                style={{ backgroundColor: agent.color || '#3B82F6' }}
              />
              <span className="font-medium">{agent.name}</span>
              {agent.is_system && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                  SYS
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
