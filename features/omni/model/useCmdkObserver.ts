import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'

export function useCmdkObserver(isOpen: boolean) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const items = useStore((state) => state.items)

  useEffect(() => {
    if (!isOpen) return

    // Функция поиска выделенного элемента
    const checkSelection = () => {
      // cmdk ставит атрибут data-selected или aria-selected
      const selectedEl = document.querySelector(
        '[cmdk-item][data-selected="true"]'
      ) as HTMLElement
      if (selectedEl && selectedEl.dataset.itemId) {
        if (selectedEl.dataset.itemId !== activeItemId) {
          setActiveItemId(selectedEl.dataset.itemId)
        }
      } else {
        // Если ничего не выделено (например, фокус в инпуте)
        setActiveItemId(null)
      }
    }

    // 1. Слушаем мутации DOM (когда классы меняются)
    const observer = new MutationObserver(checkSelection)

    // Находим список (он может появиться не сразу, поэтому ищем body или диалог)
    const listNode = document.querySelector('[cmdk-list]') || document.body

    observer.observe(listNode, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-selected', 'aria-selected'],
    })

    // 2. Слушаем движение мыши и клавиатуры (для надежности)
    window.addEventListener('keydown', checkSelection)
    window.addEventListener('mousemove', checkSelection)

    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', checkSelection)
      window.removeEventListener('mousemove', checkSelection)
    }
  }, [isOpen, activeItemId])

  // Находим сам объект
  const activeItem = items.find((i) => i.id === activeItemId) || null

  return activeItem
}
