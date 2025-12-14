// lib/hooks.ts
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export function useHotkeys(
  hotkeys: [string, (event: KeyboardEvent) => void][],
  node: HTMLElement | null = null
) {
  useEffect(() => {
    const targetNode = node ?? window

    const handleKeyDown = (event: KeyboardEvent) => {
      hotkeys.forEach(([key, handler]) => {
        const [mod, k] = key.split('+')
        if (
          event.key.toLowerCase() === k &&
          (event.metaKey || event.ctrlKey) &&
          mod === 'mod'
        ) {
          event.preventDefault()
          handler(event)
        }
      })
    }

    targetNode.addEventListener('keydown', handleKeyDown as EventListener)
    return () =>
      targetNode.removeEventListener('keydown', handleKeyDown as EventListener)
  }, [hotkeys, node])
}
