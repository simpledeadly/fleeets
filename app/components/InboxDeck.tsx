"use client"

import { useState } from "react"
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle, XCircle, Archive, Mic, Sparkles, MoreHorizontal } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { useStore, type Item } from "@/lib/store"

export default function InboxDeck() {
  const supabase = createClient()
  const allItems = useStore((state) => state.items)
  const updateItemInStore = useStore((state) => state.updateItem)

  const inboxTasks = allItems.filter(item => item.status === 'inbox')

  const handleSwipe = async (id: string, direction: "right" | "left" | "up") => {
    const taskToProcess = inboxTasks.find(t => t.id === id)
    if (!taskToProcess) return

    let statusText = "", newStatus: Item['status'] = "inbox", icon = null

    if (direction === "left") {
      newStatus = "deleted"; statusText = "Удалено"; icon = <XCircle className="text-red-500" />
    } else if (direction === "up") {
      if (taskToProcess.type === 'task') {
        toast.error("Задачи нельзя архивировать, только выполнять."); return
      }
      newStatus = "archived"; statusText = "В архиве"; icon = <Archive className="text-orange-500" />
    } else if (direction === "right") {
      if (taskToProcess.type === 'task') {
        newStatus = "planned"; statusText = "Добавлено в план"; icon = <CheckCircle className="text-green-500" />
      } else {
        newStatus = "archived"; statusText = "Сохранено в архив"; icon = <Archive className="text-orange-500" />
      }
    }

    // ИСПРАВЛЕНИЕ: Мы не удаляем, а обновляем статус в стейте
    updateItemInStore({ ...taskToProcess, status: newStatus })

    toast(statusText, {
      icon: icon,
      duration: 4000,
      action: {
        label: "Вернуть",
        onClick: () => {
          updateItemInStore({ ...taskToProcess, status: 'inbox' }) // Возвращаем в стейт
          supabase.from("items").update({ status: "inbox" }).eq("id", id).then()
        },
      },
    })

    await supabase.from("items").update({
      status: newStatus,
      planned_at: (newStatus === "planned") ? new Date().toISOString() : null
    }).eq("id", id)
  }

  if (inboxTasks.length === 0) {
    return (<div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in"> <div className="text-6xl mb-4">🧘‍♂️</div> <h2 className="text-2xl font-bold">Инбокс пуст</h2> </div>)
  }

  const visibleTasks = inboxTasks.slice(0, 3).reverse()

  return (
    <div className="relative w-full max-w-sm h-96 flex items-center justify-center">
      <AnimatePresence>
        {visibleTasks.map((task, index) => {
          const isTop = index === visibleTasks.length - 1
          return (<Card key={task.id} task={task} isTop={isTop} onSwipe={(dir) => handleSwipe(task.id, dir)} stackIndex={visibleTasks.length - 1 - index} />)
        })}
      </AnimatePresence>
    </div>
  )
}

interface CardProps { task: Item; isTop: boolean; onSwipe: (dir: "right" | "left" | "up") => void; stackIndex: number }

function Card({ task, isTop, onSwipe, stackIndex }: CardProps) {
  const supabase = createClient()
  const [isProcessing, setIsProcessing] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const updateItemInStore = useStore((state) => state.updateItem)

  const handleRefine = async (_e: React.MouseEvent) => {
    _e.stopPropagation()
    setIsProcessing(true)
    try {
      const { data } = await supabase.functions.invoke('refine-item', { body: { item_id: task.id } })
      if (data) { updateItemInStore(data) }
    } catch (e) { toast.error(`Ошибка AI:\n${e}`) }
    finally { setIsProcessing(false) }
  }

  const toggleType = async (_e: React.MouseEvent) => {
    _e.stopPropagation()
    const newType = task.type === 'task' ? 'note' : 'task'
    updateItemInStore({ ...task, type: newType })
    await supabase.from('items').update({ type: newType }).eq('id', task.id)
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100
    if (info.offset.x > threshold) onSwipe("right")
    else if (info.offset.x < -threshold) onSwipe("left")
    else if (info.offset.y < -threshold) onSwipe("up")
  }

  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5])
  const bg = useTransform(x, [-150, 0, 150], ["rgb(254, 242, 242)", "rgb(255, 255, 255)", "rgb(240, 253, 244)"])

  if (!isTop) {
    return (<motion.div layout initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1 - stackIndex * 0.05, y: stackIndex * 15, opacity: 1 - stackIndex * 0.3, zIndex: -stackIndex }} exit={{ opacity: 0, scale: 0.9 }} className="absolute w-full h-80 p-6 rounded-3xl border bg-white shadow-sm pointer-events-none"> <div className="h-4 w-20 bg-slate-100 rounded mb-4" /> <div className="h-2 w-full bg-slate-100 rounded mb-2" /> </motion.div>)
  }

  return (
    <motion.div layout style={{ x, y, rotate, opacity, backgroundColor: bg, zIndex: 100 }} drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} onDragEnd={handleDragEnd} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }} className="absolute w-full h-80 p-6 rounded-3xl border shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing">
      <div className="flex justify-between items-center w-full">
        <button onClick={toggleType} className="z-10 p-2 rounded-full text-muted-foreground bg-white/50 hover:bg-slate-100 transition-colors opacity-60 hover:opacity-100"><MoreHorizontal size={16} /></button>
        <button onClick={handleRefine} disabled={isProcessing} className="z-10 p-2 rounded-full text-muted-foreground bg-white/50 hover:bg-slate-100 transition-colors opacity-60 hover:opacity-100 disabled:opacity-50" aria-label="Обработать с помощью AI">
          {isProcessing ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={16} />}
        </button>
      </div>
      <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-between p-6 pointer-events-none">
        <div className="flex justify-between items-center text-xs text-muted-foreground uppercase font-bold tracking-widest pointer-events-none">
          <span>{task.type ?? 'NOTE'}</span>
          <span>{task.created_at ? formatDistanceToNow(new Date(task.created_at), { locale: ru, addSuffix: true }) : 'только что'}</span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-4 pointer-events-none select-none">
          <h3 className="text-2xl font-bold leading-tight text-center text-balance">{task.content}</h3>
          <p className="text-md font-medium leading-tight text-center text-balance text-neutral-600">{task.description}</p>
          {(task.metadata as any)?.source === "voice" && (<div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 py-1.5 px-3 rounded-full w-fit mx-auto border border-blue-100"><Mic size={14} /><span className="text-xs font-bold">Голос</span></div>)}
        </div>
        <div className="flex justify-between text-sm font-medium opacity-30 pointer-events-none">
          <XCircle size={24} /><Archive size={24} /><CheckCircle size={24} />
        </div>
      </div>
    </motion.div>
  )
}