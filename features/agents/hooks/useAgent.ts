'use client'

import { useState } from 'react'

export function useAgent() {
  const [isLoading, setIsLoading] = useState(false)

  const runAgent = async (
    itemId: string,
    agentId: string,
    customInput?: string
  ) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, agentId, customInput }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data
    } catch (e) {
      console.error('Agent execution failed:', e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  return { runAgent, isLoading }
}
