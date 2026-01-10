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
      // Итерируемся по всем хоткеям
      for (const [combo, handler] of hotkeys) {
        const parts = combo.toLowerCase().split('+')
        const mainKey = parts[parts.length - 1] // Последняя часть — кнопка
        const modifiers = new Set(parts.slice(0, -1)) // Всё остальное — модификаторы

        // 1. Проверка нажатой клавиши (поддержка и key, и code)
        const isKeyMatch =
          event.key.toLowerCase() === mainKey ||
          event.code.toLowerCase() === `key${mainKey}` ||
          event.code.toLowerCase() === `digit${mainKey}` // Для цифр (Digit1)

        if (!isKeyMatch) continue

        // 2. Проверка модификаторов
        const modPressed = event.metaKey || event.ctrlKey
        const shiftPressed = event.shiftKey
        const altPressed = event.altKey

        const modRequired =
          modifiers.has('mod') || modifiers.has('ctrl') || modifiers.has('meta')
        const shiftRequired = modifiers.has('shift')
        const altRequired = modifiers.has('alt')

        // 3. Если всё совпало — вызываем
        if (
          modPressed === modRequired &&
          shiftPressed === shiftRequired &&
          altPressed === altRequired
        ) {
          // ВАЖНО: Мы НЕ делаем preventDefault здесь автоматически для ВСЕХ,
          // чтобы работало копирование (mod+c).
          // Но мы передаем event в handler, чтобы он мог это сделать.
          handler(event)

          // Лайфхак: если мы нашли совпадение и это не mod+c (где может быть выделение),
          // можно было бы стопнуть тут. Но лучше управлять в конфиге.
          return
        }
      }
    }

    targetNode.addEventListener('keydown', handleKeyDown as EventListener)
    return () =>
      targetNode.removeEventListener('keydown', handleKeyDown as EventListener)
  }, [enabled, hotkeys, node])
}
