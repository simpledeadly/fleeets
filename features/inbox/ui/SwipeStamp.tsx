'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { type Item } from '@/lib/store'

interface SwipeStampProps {
  state: 'idle' | 'left' | 'right' | 'up'
  itemType: Item['type']
  isHeld: boolean
  isTop: boolean
  isFlipped: boolean
}

export function SwipeStamp({
  state,
  itemType,
  isHeld,
  isTop,
  isFlipped,
}: SwipeStampProps) {
  if (state === 'idle' || !isTop || isFlipped) return null

  const getText = () => {
    if (state === 'up') return itemType === 'task' ? 'На сегодня' : 'В архив'
    if (state === 'left') return 'Удалить'
    if (state === 'right') {
      return itemType === 'task'
        ? isHeld
          ? 'На сегодня'
          : 'В план'
        : 'В архив'
    }
    return ''
  }

  const getColor = () => {
    if (state === 'up') return 'text-orange-500 border-orange-500'
    if (state === 'left') return 'text-red-500 border-red-500'
    if (state === 'right') {
      return isHeld
        ? 'text-blue-500 border-blue-500'
        : 'text-green-500 border-green-500'
    }
    return ''
  }

  const getRotate = () => (state === 'right' ? -5 : state === 'left' ? 5 : 0)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 1.5, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          transition: { type: 'spring', stiffness: 500, damping: 30 },
        }}
        exit={{ scale: 0.5, opacity: 0 }}
        style={{ rotate: getRotate() }}
        className="absolute inset-x-0 top-10 flex items-center justify-center pointer-events-none z-50"
      >
        <span
          className={`px-6 py-2 rounded-lg border-4 font-bold text-2xl uppercase tracking-wider bg-background/80 backdrop-blur-sm ${getColor()}`}
        >
          {getText()}
        </span>
      </motion.div>
    </AnimatePresence>
  )
}
