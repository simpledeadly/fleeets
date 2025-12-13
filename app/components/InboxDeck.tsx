"use client"

import { useState } from "react"
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle, XCircle, Archive, Mic, Undo2 } from "lucide-react" // Добавил Undo2
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner" // Импорт тостов

type Task = {
  id: string
  content: string
  type: string
  created_at: string
  metadata: Record<string, unknown> | null
}

export default function InboxDeck({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const supabase = createClient()

  // Логика Свайпа
  const handleSwipe = async (id: string, direction: "right" | "left" | "up") => {
    // 1. Ищем задачу перед удалением (чтобы можно было вернуть)
    const taskToProcess = tasks.find(t => t.id === id)
    if (!taskToProcess) return

    // 2. Оптимистичное удаление из UI
    setTasks((prev) => prev.filter((t) => t.id !== id))

    // 3. Текст для тоста
    let statusText = ""
    let newStatus = "inbox"
    let icon = null

    if (direction === "right") {
      newStatus = "planned"
      statusText = "Добавлено в план"
      icon = <CheckCircle className="text-green-500" />
    } else if (direction === "left") {
      newStatus = "deleted"
      statusText = "Удалено"
      icon = <XCircle className="text-red-500" />
    } else if (direction === "up") {
      newStatus = "archived"
      statusText = "В архиве"
      icon = <Archive className="text-orange-500" />
    }

    // 4. Показываем Тост с кнопкой Отмены
    toast(statusText, {
      icon: icon,
      duration: 3000, // 3 секунды на подумать
      action: {
        label: "Вернуть",
        onClick: async () => {
          // --- ЛОГИКА ОТМЕНЫ (UNDO) ---

          // А. Вернуть в UI (ставим в начало списка)
          setTasks((prev) => [taskToProcess, ...prev])

          // Б. Вернуть в БД (статус inbox)
          await supabase
            .from("items")
            .update({ status: "inbox", planned_at: null })
            .eq("id", id)
        },
      },
    })

    // 5. Отправляем изменение в базу
    await supabase
      .from("items")
      .update({
        status: newStatus,
        planned_at: direction === "right" ? new Date().toISOString() : null
      })
      .eq("id", id)
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in zoom-in duration-500">
        <div className="text-6xl mb-4">🧘‍♂️</div>
        <h2 className="text-2xl font-bold">Инбокс пуст</h2>
        <p className="text-muted-foreground mt-2">Ты машина. Отдыхай.</p>
      </div>
    )
  }

  const visibleTasks = tasks.slice(0, 3).reverse()

  return (
    <div className="relative w-full max-w-sm h-96 flex items-center justify-center perspective-1000">
      <AnimatePresence mode="popLayout">
        {visibleTasks.map((task, index) => {
          const isTop = index === visibleTasks.length - 1
          return (
            <Card
              key={task.id}
              task={task}
              isTop={isTop}
              onSwipe={(dir) => handleSwipe(task.id, dir)}
              stackIndex={visibleTasks.length - 1 - index}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}

interface CardProps {
  task: Task
  isTop: boolean
  onSwipe: (dir: "right" | "left" | "up") => void
  stackIndex: number
}

function Card({ task, isTop, onSwipe, stackIndex }: CardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotate = useTransform(x, [-200, 200], [-15, 15]) // Чуть уменьшил угол, чтобы было "дороже"
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5])

  const bg = useTransform(
    x,
    [-150, 0, 150],
    ["rgb(254, 242, 242)", "rgb(255, 255, 255)", "rgb(240, 253, 244)"] // Более пастельные тона
  )

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100
    if (info.offset.x > threshold) {
      onSwipe("right")
    } else if (info.offset.x < -threshold) {
      onSwipe("left")
    } else if (info.offset.y < -threshold) {
      onSwipe("up")
    }
  }

  // 1. ДЛЯ ЗАДНИХ КАРТ (Заглушки)
  if (!isTop) {
    return (
      <motion.div
        layout
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{
          scale: 1 - stackIndex * 0.05,
          y: stackIndex * 15,
          opacity: 1 - stackIndex * 0.3,
          zIndex: -stackIndex
        }}
        exit={{ opacity: 0, scale: 0.9 }} // Простое исчезновение для задних
        className="absolute w-full h-80 p-6 rounded-3xl border bg-white shadow-sm pointer-events-none"
      >
        <div className="h-4 w-20 bg-slate-100 rounded mb-4" />
        <div className="h-2 w-full bg-slate-100 rounded mb-2" />
        <div className="h-2 w-2/3 bg-slate-100 rounded" />
      </motion.div>
    )
  }

  // 2. ДЛЯ ВЕРХНЕЙ КАРТЫ (Активная)
  return (
    <motion.div
      layout
      style={{ x, y, rotate, opacity, backgroundColor: bg, zIndex: 100 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}

      // ВОТ ТУТ МЫ ИСПРАВИЛИ ОШИБКУ:
      // Простое, но надежное исчезновение (уменьшение + прозрачность)
      exit={{
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.2 }
      }}

      className="absolute w-full h-80 p-6 rounded-3xl border shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-center text-xs text-muted-foreground uppercase font-bold tracking-widest pointer-events-none">
        <span>{task.type}</span>
        <span>{formatDistanceToNow(new Date(task.created_at), { locale: ru, addSuffix: true })}</span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 pointer-events-none select-none">
        <h3 className="text-2xl font-bold leading-tight text-center text-balance">
          {task.content}
        </h3>

        {(task.metadata as any)?.source === "voice" && (
          <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 py-1.5 px-3 rounded-full w-fit mx-auto border border-blue-100">
            <Mic size={14} />
            <span className="text-xs font-bold">Голос</span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-sm font-medium opacity-30 pointer-events-none">
        <XCircle size={24} />
        <Archive size={24} />
        <CheckCircle size={24} />
      </div>
    </motion.div>
  )
}