import { useEffect, useState, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'

export function useCmdkObserver(
  isOpen: boolean,
  container: HTMLElement | null
) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const items = useStore((state) => state.items)

  // Используем Ref, чтобы всегда иметь доступ к актуальным айтемам внутри колбэка
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const checkSelection = useCallback(() => {
    if (!container) return

    // Используем мгновенный срез DOM
    const selectedEl = container.querySelector(
      '[cmdk-item][aria-selected="true"], [data-selected="true"], [aria-selected="true"]'
    ) as HTMLElement

    if (selectedEl?.dataset?.itemId) {
      const newId = selectedEl.dataset.itemId
      setActiveItemId(newId)
    } else {
      // Если в DOM ничего не выбрано (бывает при перерендере),
      // сбрасываем, чтобы OmniBase подхватил фоллбек
      setActiveItemId(null)
    }
  }, [container])

  useEffect(() => {
    if (!isOpen || !container) {
      setActiveItemId(null)
      return
    }

    // 1. Инициализация: проверяем сразу
    // Небольшая задержка, чтобы дать cmdk проставить атрибуты после монтирования
    const initTimer = setTimeout(checkSelection, 10)

    // 2. Настройка обзервера
    const observer = new MutationObserver(() => {
      checkSelection()
    })

    observer.observe(container, {
      attributes: true,
      childList: true, // ВАЖНО: следим за обновлением списка
      subtree: true,
      attributeFilter: ['aria-selected', 'data-selected'],
    })

    // 3. Слушаем события навигации
    // Используем захват (true), чтобы поймать событие раньше cmdk
    const handleEvents = () => {
      // Даем cmdk 10мс на обновление DOM, прежде чем проверять
      setTimeout(checkSelection, 10)
    }

    window.addEventListener('keydown', handleEvents, true)
    window.addEventListener('mousedown', handleEvents, true)

    return () => {
      observer.disconnect()
      clearTimeout(initTimer)
      window.removeEventListener('keydown', handleEvents, true)
      window.removeEventListener('mousedown', handleEvents, true)
    }
  }, [isOpen, container, checkSelection, items.length]) // items.length заставляет обзервер переподключиться при фильтрации

  const activeItem = items.find((i) => i.id === activeItemId) || null

  return activeItem
}
