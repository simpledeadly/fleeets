"use client"

import { useState, useRef } from "react"
import { motion, useMotionValue, useTransform, PanInfo, MotionValue } from "framer-motion"
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

export function DraggableCard({ task, onSwipe, isTop }: DraggableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHeld, setIsHeld] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()
  const updateItemInStore = useStore((state) => state.updateItem)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-20, 20])

  const swipeThreshold = 100
  const holdThreshold = 400

  // -- Логика для "Штампов" --
  const xSwipeOpacity = useTransform(x, [-swipeThreshold, -swipeThreshold / 2, 0, swipeThreshold / 2, swipeThreshold], [1, 0, 0, 0, 1])
  const ySwipeOpacity = useTransform(y, [-swipeThreshold, -swipeThreshold / 2, 0], [1, 0, 0])

  // ИСПРАВЛЕНИЕ: Явно указываем типы для значений из массива
  const stampOpacity = useTransform([xSwipeOpacity, ySwipeOpacity], ([latestX, latestY]) =>
    Math.max(latestX as number, latestY as number)
  )

  const stampRotate = useTransform(x, [-swipeThreshold, swipeThreshold], [-5, 5])

  const stampText = useTransform([x, y], ([latestX, latestY]) => {
    // ИСПРАВЛЕНИЕ: Приводим unknown к number
    const currentX = latestX as number
    const currentY = latestY as number

    if (currentY < -swipeThreshold) {
      return "В архив"
    }
    if (currentX > swipeThreshold) {
      return task.type === 'task' ? (isHeld ? "На сегодня" : "В план") : "В архив"
    }
    if (currentX < -swipeThreshold) {
      return "Удалить"
    }
    return ""
  }) as MotionValue<string>

  const stampColor = useTransform([x, y], ([latestX, latestY]) => {
    const currentX = latestX as number
    const currentY = latestY as number

    if (currentY < -swipeThreshold) {
      return "text-orange-500 border-orange-500"
    }
    if (currentX > swipeThreshold) {
      return isHeld ? "text-blue-500 border-blue-500" : "text-green-500 border-green-500"
    }
    if (currentX < -swipeThreshold) {
      return "text-red-500 border-red-500"
    }
    return "text-transparent border-transparent"
  }) as MotionValue<string>

  // -- Обработчики жестов --
  const handleDrag = (_e: unknown, info: PanInfo) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (task.type === 'task' && info.offset.x > swipeThreshold && info.velocity.x === 0 && !isHeld) {
      setIsHeld(true)
    }
  }

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (info.offset.x > swipeThreshold) onSwipe(isHeld && task.type === 'task' ? "today" : "right")
    else if (info.offset.x < -swipeThreshold) onSwipe("left")
    else if (info.offset.y < -swipeThreshold) onSwipe("up")
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
      {/* ИСПРАВЛЕНИЕ СТРУКТУРЫ ДЛЯ FLIP-АНИМАЦИИ */}
      <motion.div
        drag={isTop && !isFlipped}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
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

        {/* НОВЫЙ КОМПОНЕНТ "ШТАМП" */}
        <motion.div
          style={{ opacity: stampOpacity, rotate: stampRotate }}
          className="absolute inset-x-0 top-12 flex items-center justify-center pointer-events-none" // Располагаем сверху
        >
          <motion.span
            className={`px-6 py-2 rounded-lg border-2 font-bold text-2xl uppercase tracking-wider ${stampColor.get()}`}
            style={{
              color: stampColor.get().split(' ')[0], // Берем только text-color
              borderColor: stampColor.get().split(' ')[1] // Берем только border-color
            }}
          >
            {stampText}
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}