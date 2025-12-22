'use client'

import { motion, scale } from 'framer-motion'
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
        scale: 1,
        width: 'min(90vw, 600px)', // Ширина: 90% экрана, но не шире 600px
        height: 'min(80vh, 700px)', // Высота: 80% экрана, но не выше 700px
        x: 0,
        y: -50,
        rotate: 0,
        rotateY: 0,
        rotateZ: 0,
        zIndex: 100,
        opacity: 1,
      }
    : {
        scale: 1 - index * 0.05,
        width: '100%',
        height: '24rem',
        x: 0,
        y: index * 15,
        rotate: isTop ? 0 : 0,
        rotateY: 0,
        zIndex: total - index,
        opacity: 1 - index * 0.2,
      }

  return (
    <>
      <motion.div
        key={item.id}
        className="absolute w-full h-96"
        style={{ perspective: 1000, zIndex: isTop ? 100 : 1 }}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={animateState}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
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
