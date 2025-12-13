"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useMotionValue, useTransform, PanInfo, animate, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useStore, type Item } from "@/lib/store"
import { CardFace } from "./CardFace"
import { CardBack } from "./CardBack"

interface DraggableCardProps {
  task: Item
  onSwipe: (dir: "right" | "left" | "up" | "today") => void
  isTop: boolean
}

type SwipeState = "idle" | "left" | "right" | "up"

export function DraggableCard({ task, onSwipe, isTop }: DraggableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHeld, setIsHeld] = useState(false)
  const [swipeState, setSwipeState] = useState<SwipeState>("idle")
  const [isProcessing, setIsProcessing] = useState(false)

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const holdTimer = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()
  const updateItemInStore = useStore((state) => state.updateItem)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-15, 15])

  const swipeThreshold = 120
  const holdThreshold = 400

  // --- Новая логика "Штампов" ---
  const getStampText = () => {
    if (swipeState === 'up') return 'В архив'
    if (swipeState === 'left') return 'Удалить'
    if (swipeState === 'right') {
      return task.type === 'task' ? (isHeld ? 'На сегодня' : 'В план') : 'В архив'
    }
    return ''
  }

  const getStampColor = () => {
    if (swipeState === 'up') return 'text-orange-500 border-orange-500'
    if (swipeState === 'left') return 'text-red-500 border-red-500'
    if (swipeState === 'right') {
      return isHeld ? 'text-blue-500 border-blue-500' : 'text-green-500 border-green-500'
    }
    return ''
  }

  const getStampRotate = () => {
    if (swipeState === 'right') return -5
    if (swipeState === 'left') return 5
    return 0
  }

  // -- Обработчики жестов --
  const handleDrag = (_e: unknown, info: PanInfo) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    if (info.offset.x > swipeThreshold) setSwipeState("right")
    else if (info.offset.x < -swipeThreshold) setSwipeState("left")
    else if (info.offset.y < -swipeThreshold) setSwipeState("up")
    else {
      setSwipeState("idle")
      setIsHeld(false)
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }

  useEffect(() => {
    if (swipeState === 'right' && task.type === 'task' && !isHeld) {
      holdTimer.current = setTimeout(() => setIsHeld(true), holdThreshold)
    }
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }, [swipeState, isHeld, task.type])

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    if (swipeState !== "idle") {
      const exitX = (info.offset.x > 0 ? 1 : -1) * 500
      const exitY = info.offset.y < 0 ? -500 : 0

      animate(x, exitX, { type: 'spring', stiffness: 300, damping: 30 })
      animate(y, exitY, { type: 'spring', stiffness: 300, damping: 30 })

      setTimeout(() => {
        onSwipe(isHeld && task.type === 'task' ? "today" : swipeState)
      }, 100)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 })
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
    setIsHeld(false)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    longPressTimer.current = setTimeout(() => {
      if (x.get() === 0 && y.get() === 0) setIsFlipped(true)
    }, holdThreshold)
  }

  const handlePointerUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }

  const handleFlip = (e: React.MouseEvent) => { e.stopPropagation(); setIsFlipped(!isFlipped) }

  const handleRefine = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProcessing(true)

    try {
      const { data } = await supabase.functions.invoke('refine-item', { body: { item_id: task.id } })
      if (data) { updateItemInStore(data) }
    } catch (err) { // <-- Заменил 'e' на 'err'
      console.error("Refine error:", err)
      toast.error("Ошибка AI")
    } finally {
      setIsProcessing(false)
    }
  }
  const toggleType = async (e: React.MouseEvent) => { e.stopPropagation(); const newType = task.type === 'task' ? 'note' : 'task'; updateItemInStore({ ...task, type: newType }); await supabase.from('items').update({ type: newType }).eq('id', task.id) }

  return (
    <motion.div
      className="absolute w-full h-96"
      style={{ perspective: 1000, zIndex: isTop ? 100 : 1 }}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 40 } }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
    >
      <motion.div
        drag={isTop && !isFlipped}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="relative w-full h-full"
        style={{ x, y, rotate, transformStyle: "preserve-3d" }}
      >
        <motion.div
          className="absolute w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <CardFace task={task} isProcessing={isProcessing} onToggleType={toggleType} onRefine={handleRefine} onFlip={handleFlip} />
          <CardBack task={task} onFlip={handleFlip} />
        </motion.div>

        {/* НОВЫЙ "ШТАМП" */}
        <AnimatePresence>
          {swipeState !== 'idle' && (
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }}
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