'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type Item } from '@/lib/store'
import { CardFace } from './CardFace'
import { CardBack } from './CardBack'
import { useInboxCard } from '../model/useInboxCard'
import { SwipeStamp } from './SwipeStamp'

interface InboxCardProps {
  item: Item
  isTop: boolean
  index: number
  total: number
}

export function InboxCard({ item, isTop, index, total }: InboxCardProps) {
  // Подключаем логику
  const {
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
    similarItems,
    isSearching,
    hasSimilar,
    handlers,
  } = useInboxCard(item, isTop)

  const animateState = isFlipped
    ? {
        scale: 1.05,
        x: 0,
        y: 0,
        rotate: 0,
        rotateY: 180,
        zIndex: 1000,
      }
    : {
        scale: 1 - index * 0.05,
        y: index * 15,
        rotate: isTop ? 0 : 0,
        rotateY: 0,
        zIndex: total - index,
        opacity: 1 - index * 0.2,
      }

  return (
    <>
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-90"
            onClick={() => setIsFlipped(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        key={item.id}
        className="absolute w-full h-96"
        style={{
          x: isFlipped ? 0 : x,
          y: isFlipped ? 0 : y,
          rotate: isFlipped ? 0 : rotate,
          perspective: 1000,
          zIndex: isFlipped ? 100 : total - index,
        }}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={animateState}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      >
        <motion.div
          drag={isTop && !isFlipped && !isEditing}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDrag={handlers.handleDrag}
          onDragEnd={handlers.handleDragEnd}
          onPointerDown={handlers.handlePointerDown}
          onPointerUp={handlers.handlePointerUp}
          className="relative w-full h-full"
          style={{ x, y, rotate, transformStyle: 'preserve-3d' }}
        >
          <motion.div
            className="absolute w-full h-full"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <div className="absolute w-full h-full backface-hidden">
              <CardFace
                item={item}
                isProcessing={isProcessing}
                onRefine={handlers.handleRefine}
                hasSimilar={hasSimilar}
                onFlip={handlers.handleFlip}
                index={index}
                total={total}
                setEditing={setIsEditing}
              />
            </div>
            <div
              className="absolute w-full h-full backface-hidden"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <CardBack
                item={item}
                onFlip={handlers.handleFlip}
                setEditing={setIsEditing}
                similarItems={similarItems}
                isSearching={isSearching}
              />
            </div>
          </motion.div>

          <SwipeStamp
            state={swipeState}
            itemType={item.type}
            isHeld={isHeld}
            isTop={isTop && !isFlipped}
            isFlipped={isFlipped}
          />
        </motion.div>
      </motion.div>
    </>
  )
}
