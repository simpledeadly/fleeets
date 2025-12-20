'use client'

import { useState, useRef, useEffect } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
  animate,
  AnimatePresence,
} from 'framer-motion'
import { type Item } from '@/lib/store'
import { useItemActions } from '@/features/item/model/useItemActions'
import { CardFace } from './CardFace'
import { CardBack } from './CardBack'
import { findSimilarItems } from '@/features/ai'

interface InboxCardProps {
  item: Item
  isTop: boolean
  index: number
  total: number
}

type SwipeState = 'idle' | 'left' | 'right' | 'up'

export function InboxCard({ item, isTop, index, total }: InboxCardProps) {
  // Подключаем логику (actions)
  const { update, remove, refine } = useItemActions(item)

  // Твои стейты
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHeld, setIsHeld] = useState(false)
  const [swipeState, setSwipeState] = useState<SwipeState>('idle')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [similarItems, setSimilarItems] = useState<Item[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Твои таймеры и пороги
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const holdTimer = useRef<NodeJS.Timeout | null>(null)
  const swipeThreshold = 120
  const holdThreshold = 400

  // Твоя физика
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-15, 15])

  useEffect(() => {
    // Искать только для верхней карты и только один раз
    if (isTop && !isSearching && similarItems.length === 0) {
      // Задержка, чтобы не спамить, если юзер быстро свайпает
      const searchTimer = setTimeout(async () => {
        setIsSearching(true)
        try {
          const results = await findSimilarItems(item.id)
          if (results && results.length > 0) {
            setSimilarItems(results as any)
            // 🔥 АВТО-ПЕРЕВОРОТ
            setIsFlipped(true)
          }
        } catch (e) {
          console.error('Auto-search failed:', e)
        } finally {
          setIsSearching(false)
        }
      }, 700) // 0.7 секунды

      return () => clearTimeout(searchTimer)
    }
  }, [isTop, item.id])

  // Твоя логика штампов
  const getStampText = () => {
    if (swipeState === 'up')
      return item.type === 'task' ? 'На сегодня' : 'В архив'
    if (swipeState === 'left') return 'Удалить'
    if (swipeState === 'right') {
      return item.type === 'task'
        ? isHeld
          ? 'На сегодня'
          : 'В план'
        : 'В архив'
    }
    return ''
  }

  const getStampColor = () => {
    if (swipeState === 'up') return 'text-orange-500 border-orange-500'
    if (swipeState === 'left') return 'text-red-500 border-red-500'
    if (swipeState === 'right') {
      return isHeld
        ? 'text-blue-500 border-blue-500'
        : 'text-green-500 border-green-500'
    }
    return ''
  }

  const getStampRotate = () => {
    if (swipeState === 'right') return -5
    if (swipeState === 'left') return 5
    return 0
  }

  // Твои обработчики
  const handleDrag = (_e: unknown, info: PanInfo) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    if (info.offset.x > swipeThreshold) setSwipeState('right')
    else if (info.offset.x < -swipeThreshold) setSwipeState('left')
    else if (info.offset.y < -swipeThreshold) setSwipeState('up')
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

    if (swipeState !== 'idle') {
      const exitX = (info.offset.x > 0 ? 1 : -1) * 300 // Чуть дальше, чтоб наверняка
      const exitY = info.offset.y < 0 ? -300 : 0

      animate(x, exitX, { type: 'spring', stiffness: 300, damping: 30 })
      animate(y, exitY, { type: 'spring', stiffness: 300, damping: 30 })

      // ЛОГИКА ДЕЙСТВИЙ ЧЕРЕЗ ХУК
      setTimeout(async () => {
        if (swipeState === 'left') {
          await remove() // Тост "Удалено" уже внутри remove
        } else if (swipeState === 'up') {
          // Up -> Сегодня
          await update({ status: 'today' }, 'Задача взята в фокус на сегодня')
        } else if (swipeState === 'right') {
          if (item.type === 'task') {
            if (isHeld) {
              await update({ status: 'today' }, 'Задача взята в фокус')
            } else {
              await update({ status: 'planned' }, 'Добавлено в План')
            }
          } else {
            await update({ status: 'archived' }, 'Отправлено в Архив')
          }
        }
      }, 50)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 })
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
    setIsHeld(false)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return // Не флипаем при редактировании
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

  return (
    <motion.div
      key={item.id}
      className="absolute w-full h-96"
      style={{ perspective: 1000, zIndex: isTop ? 100 : 1 }}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 40 },
      }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
    >
      <motion.div
        drag={isTop && !isFlipped && !isEditing}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="relative w-full h-full"
        style={{ x, y, rotate, transformStyle: 'preserve-3d' }}
      >
        <motion.div
          className="absolute w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <CardFace
            item={item}
            isProcessing={isProcessing}
            onRefine={handleRefine}
            onFlip={handleFlip}
            index={index} // Для счетчика
            total={total} // Для счетчика
            setEditing={setIsEditing}
          />
          <CardBack
            item={item}
            onFlip={handleFlip}
            setEditing={setIsEditing}
            similarItems={similarItems}
            isSearching={isSearching}
          />
        </motion.div>

        {/* ШТАМП (Твой код) */}
        <AnimatePresence>
          {swipeState !== 'idle' && (
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: { type: 'spring', stiffness: 500, damping: 30 },
              }}
              exit={{ scale: 0.5, opacity: 0 }}
              style={{ rotate: getStampRotate() }}
              className="absolute inset-x-0 top-10 flex items-center justify-center pointer-events-none"
            >
              <span
                className={`px-6 py-2 rounded-lg border-4 font-bold text-2xl uppercase tracking-wider ${getStampColor()}`}
              >
                {getStampText()}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
