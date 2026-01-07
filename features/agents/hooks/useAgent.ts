'use client'

import { useState } from 'react'
import { AgentRunOptions } from '../model/types'

export function useAgent() {
  const [isLoading, setIsLoading] = useState(false)

  const runAgent = async (agentId: string, options: AgentRunOptions) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          ...options, // Прокидываем itemId, query, isTest и т.д.
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data
    } catch (e: any) {
      console.error('Agent execution failed:', e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  return { runAgent, isLoading }
}
