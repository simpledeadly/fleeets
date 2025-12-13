"use client"

import { useStore } from "@/lib/store"
import { formatDistanceToNow, differenceInHours } from "date-fns"
import { ru } from "date-fns/locale"
import { Ghost, Mic, Zap, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PlanList() {
  const items = useStore((state) => state.items)

  const tasks = items
    .filter(item => item.status === 'planned' && item.type === 'task')
    .sort((a, b) => {
      const dateA = new Date(a.planned_at || a.created_at || 0).getTime()
      const dateB = new Date(b.planned_at || b.created_at || 0).getTime()
      return dateA - dateB
    })

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold">План пуст</h2>
        <p className="text-muted-foreground mt-2">Все задачи в Инбоксе или уже выполнены.</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-300">
      {tasks.map((task) => {
        const plannedDate = task.planned_at || task.created_at
        const hoursOld = plannedDate ? differenceInHours(new Date(), new Date(plannedDate)) : 0

        let opacityClass = "opacity-100"
        let rotIcon = null
        let rotStatus = "fresh"

        if (hoursOld > 48) {
          opacityClass = "opacity-40 grayscale-[0.8]"
          rotIcon = <Ghost size={16} className="text-stone-500" />
          rotStatus = "rotten"
        } else if (hoursOld > 24) {
          opacityClass = "opacity-75"
          rotStatus = "stale"
        }

        return (
          <div
            key={task.id}
            className={cn(
              "relative group flex flex-col gap-2 p-5 rounded-2xl border bg-white shadow-sm transition-all duration-500",
              opacityClass,
              rotStatus === "rotten" && "border-stone-200 bg-stone-50"
            )}
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                {rotIcon}
                <span className={cn("font-mono", rotStatus === "rotten" && "text-red-900 font-bold")}>
                  {rotStatus === "rotten" ? "ГНИЁТ" : task.type?.toUpperCase()}
                </span>
              </div>
              <span>
                {plannedDate ? formatDistanceToNow(new Date(plannedDate), { locale: ru, addSuffix: true }) : ''}
              </span>
            </div>

            <div className="flex justify-between items-start gap-4 flex-col">
              <h3 className={cn(
                "text-lg font-semibold leading-snug",
                rotStatus === "rotten" && "line-through decoration-stone-300 decoration-2"
              )}>
                {task.content}
              </h3>
              <p className="text-md font-medium leading-tight text-balance text-neutral-600">{task.description}</p>
            </div>

            <div className="flex items-center gap-2 mt-1">
              {(task.metadata as any)?.source === 'voice' && <Mic size={14} className="text-blue-400" />}
              {task.is_quick && (
                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Zap size={10} /> БЛИЦ
                </span>
              )}
            </div>

            {rotStatus === "rotten" && (
              <button className="absolute -right-2 -top-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                <AlertCircle size={16} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}