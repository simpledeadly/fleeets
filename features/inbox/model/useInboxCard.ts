'use client'

import { useState, useRef, useEffect } from 'react'
import { useMotionValue, useTransform, animate, PanInfo } from 'framer-motion'
import { useStore, type Item } from '@/lib/store'
import { useItemActions } from '@/features/item/model/useItemActions'
import { findSimilarItemsByQuery } from '@/features/ai'

export type SwipeState = 'idle' | 'left' | 'right' | 'up' | 'down'

export function useInboxCard(
  item: Item,
  isTop: boolean,
  onSwipeDown?: () => void
) {
  const { update, remove, refine } = useItemActions(item)
  const incrementStats = useStore((state) => state.incrementInboxStats)

  // States
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHeld, setIsHeld] = useState(false)
  const [swipeState, setSwipeState] = useState<SwipeState>('idle')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // RAG States
  const [similarItems, setSimilarItems] = useState<Item[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSimilar, setHasSimilar] = useState(false)

  // Timers
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const holdTimer = useRef<NodeJS.Timeout | null>(null)

  // Constants
  const swipeThreshold = 120
  const holdThreshold = 400

  // Physics
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-8, 8])

  // --- RAG EFFECT ---
  useEffect(() => {
    if (isTop && !isSearching && similarItems.length === 0) {
      const searchTimer = setTimeout(async () => {
        setIsSearching(true)
        try {
          const results = await findSimilarItemsByQuery(
            `${item.content}\n${item.description || ''}\n${
              item.raw_content || ''
            }`
          )
          if (results && results.length > 0) {
            setHasSimilar(true)
            setSimilarItems(results as Item[])
          }
        } catch (e) {
          console.error(e)
        } finally {
          setIsSearching(false)
        }
      }, 1000)
      return () => clearTimeout(searchTimer)
    }
  }, [isTop, item.content, item.description, item.raw_content])

  // --- DRAG HANDLERS ---
  const handleDrag = (_e: unknown, info: PanInfo) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    if (info.offset.x > swipeThreshold) setSwipeState('right')
    else if (info.offset.x < -swipeThreshold) setSwipeState('left')
    else if (info.offset.y < -swipeThreshold) setSwipeState('up')
    else if (info.offset.y > swipeThreshold) setSwipeState('down')
    else {
      setSwipeState('idle')
      setIsHeld(false)
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }

  useEffect(() => {
    if (swipeState === 'right' && item.type === 'task' && !isHeld) {
      holdTimer.current = setTimeout(() => setIsHeld(true), holdThreshold)
    }
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }, [swipeState, isHeld, item.type])

  const handleDragEnd = async (_e: unknown, info: PanInfo) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    if (swipeState === 'down' && onSwipeDown) {
      onSwipeDown() // Включаем сетку
      // Возвращаем карточку на место (визуально), чтобы при выходе из сетки она была тут
      animate(x, 0, { duration: 0.2 })
      animate(y, 0, { duration: 0.2 })
      setIsHeld(false)
      return // Прерываем функцию, чтобы не сработала логика полета
    }

    if (swipeState !== 'idle') {
      const exitX = (info.offset.x > 0 ? 1 : -1) * 200
      const exitY = info.offset.y < 0 ? -200 : 0

      animate(x, exitX, { type: 'spring', stiffness: 300, damping: 30 })
      animate(y, exitY, { type: 'spring', stiffness: 300, damping: 30 })

      setTimeout(() => {
        if (swipeState === 'left') {
          remove()
          incrementStats()
        } else if (swipeState === 'up') {
          update({ status: 'today' }, 'Задача взята в фокус')
          incrementStats()
        } else if (swipeState === 'right') {
          if (item.type === 'task') {
            if (isHeld) update({ status: 'today' }, 'Задача взята в фокус')
            else update({ status: 'planned' }, 'Добавлено в План')
          } else {
            update({ status: 'archived' }, 'Отправлено в Архив')
          }
          incrementStats()
        }
      }, 50)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 })
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
    setIsHeld(false)
  }

  // --- POINTER HANDLERS ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return
    if ((e.target as HTMLElement).closest('button, textarea, input')) return

    longPressTimer.current = setTimeout(() => {
      if (x.get() === 0 && y.get() === 0) setIsFlipped(true)
    }, holdThreshold)
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }

  const handleRefine = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProcessing(true)
    refine().finally(() => setIsProcessing(false))
  }

  return {
    // State
    x,
    y,
    rotate,
    isFlipped,
    setIsFlipped,
    isEditing,
    setIsEditing,
    isProcessing,
    swipeState,
    isHeld,
    // RAG Data
    similarItems,
    isSearching,
    hasSimilar,
    // Handlers
    handlers: {
      handleDrag,
      handleDragEnd,
      handlePointerDown,
      handlePointerUp,
      handleFlip,
      handleRefine,
    },
  }
}
