'use client'

import { motion } from 'framer-motion'
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
  onSwipeDown: () => void
}

export function InboxCard({
  item,
  isTop,
  index,
  total,
  onSwipeDown,
}: InboxCardProps) {
  const {
    x,
    y,
    rotate,
    isFlipped,
    isEditing,
    setIsEditing,
    isProcessing,
    swipeState,
    isHeld,
    similarItems,
    isSearching,
    hasSimilar,
    handlers,
  } = useInboxCard(item, isTop, onSwipeDown)

  const animateState = isFlipped
    ? {
        scale: 1,
        width: '90vw',
        height: '75vh',
        maxWidth: '600px',
        maxHeight: '700px',
        x: 0,
        y: -50,
        rotate: 0,
        zIndex: 100,
        opacity: 1,
      }
    : {
        scale: 1,
        width: '100%',
        height: '24rem',
        maxWidth: '100%',
        maxHeight: '100%',
        x: 0,
        y: index * 15,
        rotate: isTop ? 0 : 0,
        rotateY: 0,
        zIndex: 30,
        opacity: 1 - index * 0.2,
      }

  return (
    <>
      <motion.div
        key={item.id}
        className="absolute"
        style={{ perspective: 1000, zIndex: isTop ? 80 : 30 }}
        // layout
        // layoutId={`card-${item.id}`}
        initial={{
          scale: 0.95,
          opacity: 0,
          y: 20,
          // Добавляем эти поля, чтобы они не анимировались с нуля
          minWidth: '100%',
          minHeight: '24rem',
          maxWidth: '100%',
          maxHeight: '100%',
          zIndex: 30,
        }}
        transition={{
          // Пружина для движения и вращения
          default: { type: 'spring', stiffness: 1000, damping: 40 },
          // Плавная кривая для размеров (чтобы не дрыгалось)
          width: { duration: 0.2 },
          height: { duration: 0.2 },
          maxWidth: { duration: 0.2 },
          maxHeight: { duration: 0.2 },
        }}
        animate={animateState}
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
            transition={{
              default: { type: 'spring', stiffness: 440, damping: 32 },
            }}
          >
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
            <CardBack
              item={item}
              onFlip={handlers.handleFlip}
              setEditing={setIsEditing}
              similarItems={similarItems}
              isSearching={isSearching}
            />
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
