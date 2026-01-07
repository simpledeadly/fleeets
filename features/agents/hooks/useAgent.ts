// features/agents/hooks/useAgent.ts
'use client'
import { useState } from 'react'
import { AgentRunContext, AgentSessionResult } from '../model/types'

export function useAgent() {
  const [isLoading, setIsLoading] = useState(false)

  const runAgent = async (
    agentId: string,
    context: AgentRunContext
  ): Promise<AgentSessionResult> => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, ...context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Agent failed')
      return data
    } finally {
      setIsLoading(false)
    }
  }

  return { runAgent, isLoading }
}
