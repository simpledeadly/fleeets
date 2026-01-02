import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'

export function useCmdkObserver(
  isOpen: boolean,
  container: HTMLElement | null
) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const items = useStore((state) => state.items)

  useEffect(() => {
    // [ROUND 15] Сбрасываем состояние при закрытии, чтобы следующее открытие было чистым
    if (!isOpen) {
      setActiveItemId(null)
      return
    }

    if (!container) return

    // Функция поиска выделенного элемента ВНУТРИ контейнера
    const checkSelection = () => {
      // [ROUND 14] Проверяем оба возможных атрибута выделения
      const selectedEl = (container.querySelector(
        '[cmdk-item][data-selected="true"]'
      ) ||
        container.querySelector(
          '[cmdk-item][aria-selected="true"]'
        )) as HTMLElement

      if (selectedEl && selectedEl.dataset.itemId) {
        // [ROUND 15] Используем функциональное обновление, чтобы не зависеть от активного ID в deps
        setActiveItemId((prev) => {
          const currentId = selectedEl.dataset.itemId!
          return prev !== currentId ? currentId : prev
        })
      } else {
        setActiveItemId(null)
      }
    }

    // [ROUND 14] "Взрывная" проверка (Burst Check)
    checkSelection()
    const burstInterval = setInterval(checkSelection, 50)
    const burstTimeout = setTimeout(() => clearInterval(burstInterval), 300)

    // 1. Слушаем мутации DOM ВНУТРИ контейнера
    const observer = new MutationObserver(checkSelection)

    observer.observe(container, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-selected', 'aria-selected', 'data-value'],
    })

    // 2. Слушаем движение мыши и клавиатуры
    window.addEventListener('keydown', checkSelection)
    window.addEventListener('mousemove', checkSelection)

    return () => {
      clearInterval(burstInterval)
      clearTimeout(burstTimeout)
      observer.disconnect()
      window.removeEventListener('keydown', checkSelection)
      window.removeEventListener('mousemove', checkSelection)
    }
  }, [isOpen, container])

  // Находим сам объект
  const activeItem = items.find((i) => i.id === activeItemId) || null

  return activeItem
}
