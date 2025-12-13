import { useState, useRef } from "react"
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useStore, type Item } from "@/lib/store"
import { CardFace } from "./CardFace"
import { CardBack } from "./CardBack"
import { SwipeFeedback } from "./SwipeFeedback"

interface DraggableCardProps {
  task: Item
  onSwipe: (dir: "right" | "left" | "up" | "today") => void
  isTop: boolean
}

export function DraggableCard({ task, onSwipe }: DraggableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHeld, setIsHeld] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()
  const updateItemInStore = useStore((state) => state.updateItem)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const swipeThreshold = 100
  const holdThreshold = 400

  const rotate = useTransform(x, [-300, 300], [-20, 20])
  const background = useTransform(x, [-swipeThreshold, 0, swipeThreshold], ["rgba(239, 68, 68, 0.05)", "rgba(255, 255, 255, 0)", "rgba(34, 197, 94, 0.05)"])
  const actionTextOpacity = useTransform(x, [-swipeThreshold, -swipeThreshold / 1.5, 0, swipeThreshold / 1.5, swipeThreshold], [1, 0.3, 0, 0.3, 1])
  const actionTextLeft = useTransform(x, v => (v < -swipeThreshold + 1 ? "Удалить" : "") as string)
  const actionTextRight = useTransform(x, v => (v > swipeThreshold - 1 ? (task.type === 'task' ? (isHeld ? "На сегодня" : "В план") : "В архив") : "") as string)
  
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
    // Не запускаем таймер, если клик по кнопке
    if ((e.target as HTMLElement).closest('button')) return

    longPressTimer.current = setTimeout(() => {
      if (x.get() === 0 && y.get() === 0) { setIsFlipped(true) }
    }, holdThreshold)
  }

  const handlePointerUp = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current) } }

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
      style={{ perspective: 1000, zIndex: 100 }}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 40 } }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
    >
      <SwipeFeedback x={x} actionTextOpacity={actionTextOpacity} actionTextLeft={actionTextLeft} actionTextRight={actionTextRight} background={background} />
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <motion.div
          className="absolute w-full h-full"
          style={{ x, y, rotate }}
          drag={!isFlipped}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <CardFace task={task} isProcessing={isProcessing} onToggleType={toggleType} onRefine={handleRefine} onFlip={handleFlip} />
          <CardBack task={task} onFlip={handleFlip} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}