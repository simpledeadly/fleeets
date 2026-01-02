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
  options: { enabled?: boolean; node?: HTMLElement | null } = {}
) {
  const { enabled = true, node = null } = options

  useEffect(() => {
    if (!enabled) return

    const targetNode = node ?? window

    const handleKeyDown = (event: KeyboardEvent) => {
      hotkeys.forEach(([key, handler]) => {
        const parts = key.split('+')
        const hasMod = parts.length > 1 && parts[0] === 'mod'
        const k = hasMod ? parts[1] : parts[0]

        // Проверяем соответствие клавиши
        const keyMatch =
          event.key.toLowerCase() === k.toLowerCase() ||
          event.code.toLowerCase() === `key${k.toLowerCase()}`

        if (keyMatch) {
          const modMatch = hasMod
            ? event.metaKey || event.ctrlKey
            : !event.metaKey && !event.ctrlKey

          if (modMatch) {
            event.preventDefault()
            handler(event)
          }
        }
      })
    }

    targetNode.addEventListener('keydown', handleKeyDown as EventListener)
    return () =>
      targetNode.removeEventListener('keydown', handleKeyDown as EventListener)
  }, [enabled, hotkeys, node])
}
