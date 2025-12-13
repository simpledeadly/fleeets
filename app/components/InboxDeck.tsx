"use client"

import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle, XCircle, Archive } from "lucide-react"
import { toast } from "sonner"
import { useStore, type Item } from "@/lib/store"
import { DraggableCard } from "./inbox/DraggableCard"

export default function InboxDeck() {
  const allItems = useStore((state) => state.items)
  const updateItemInStore = useStore((state) => state.updateItem)
  const inboxTasks = allItems.filter(item => item.status === 'inbox')
  const supabase = createClient()

  const handleSwipe = async (id: string, direction: "right" | "left" | "up" | "today") => {
    const taskToProcess = inboxTasks.find(t => t.id === id)
    if (!taskToProcess) return

    let statusText = "", newStatus: Item['status'] = "inbox", icon = null

    if (direction === "left") { newStatus = "deleted"; statusText = "Удалено"; icon = <XCircle className="text-red-500" /> }
    else if (direction === "up") { if (taskToProcess.type === 'task') { toast.error("Задачи нельзя архивировать."); return } newStatus = "archived"; statusText = "В архиве"; icon = <Archive className="text-orange-500" /> }
    else if (direction === "right") { if (taskToProcess.type === 'task') { newStatus = "planned"; statusText = "Добавлено в план"; icon = <CheckCircle className="text-green-500" /> } else { newStatus = "archived"; statusText = "Сохранено в архив"; icon = <Archive className="text-orange-500" /> } }
    else if (direction === "today") { if (taskToProcess.type !== 'task') return; newStatus = "today"; statusText = "На сегодня!"; icon = <CheckCircle className="text-blue-500" /> }

    updateItemInStore({ ...taskToProcess, status: newStatus })

    toast(statusText, { icon: icon, duration: 4000, action: { label: "Вернуть", onClick: async () => { updateItemInStore({ ...taskToProcess, status: 'inbox' }); try { await supabase.from("items").update({ status: "inbox" }).eq("id", id) } catch (e) { console.error("Undo failed:", e) } }, }, })

    try { await supabase.from("items").update({ status: newStatus, planned_at: (newStatus === "planned" || newStatus === "today") ? new Date().toISOString() : null }).eq("id", id) }
    catch (e) { console.error("Swipe failed:", e); toast.error("Ошибка синхронизации. Проверьте соединение.") }
  }

  if (inboxTasks.length === 0) { return (<div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in"> <div className="text-6xl mb-4">🧘‍♂️</div> <h2 className="text-2xl font-bold">Инбокс пуст</h2> </div>) }

  const visibleTasks = inboxTasks.slice(0, 3).reverse()

  return (
    <div className="relative w-full max-w-sm h-96 flex items-center justify-center">
      <AnimatePresence>
        {visibleTasks.map((task, index) => {
          const isTop = index === visibleTasks.length - 1
          const stackIndex = visibleTasks.length - 1 - index
          if (!isTop) {
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1 - stackIndex * 0.05, y: stackIndex * 15, opacity: 1 - stackIndex * 0.3, zIndex: -stackIndex }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute w-full h-96 rounded-3xl border bg-white shadow-sm pointer-events-none"
              />
            )
          }
          return (<DraggableCard key={task.id} task={task} isTop={isTop} onSwipe={(dir) => handleSwipe(task.id, dir)} />)
        })}
      </AnimatePresence>
    </div>
  )
}