import { createClient } from "@/lib/supabase/server"
import { formatDistanceToNow, differenceInHours } from "date-fns"
import { ru } from "date-fns/locale"
import { AlertCircle, Ghost, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function PlanPage() {
  const supabase = await createClient()

  // 1. Получаем задачи со статусом 'planned'
  const { data: tasks } = await supabase
    .from("items")
    .select("*")
    .eq("status", "planned")
    .eq("type", "task")
    .order("planned_at", { ascending: false }) // Свежие (недавно добавленные) сверху? Или старые? 
  // Дилемма: Если старые сверху - они гниют перед глазами. Давай так.
  // .order("planned_at", { ascending: true }); 

  if (!tasks || tasks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold">План чист</h1>
        <p className="text-muted-foreground">Иди в Инбокс, набери задач.</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-4 pb-24 bg-slate-50/50">
      <div className="max-w-md mx-auto space-y-6">
        <header className="pt-8 px-2">
          <h1 className="text-3xl font-bold tracking-tight">Твой План</h1>
          <p className="text-muted-foreground text-sm">
            {tasks.length} задач в очереди
          </p>
        </header>

        <div className="space-y-3">
          {tasks.map((task) => {
            // МАТЕМАТИКА ГНИЕНИЯ
            const hoursOld = differenceInHours(new Date(), new Date(task.planned_at || task.created_at))

            let opacityClass = "opacity-100"
            let rotIcon = null
            let rotStatus = "fresh"

            if (hoursOld > 48) {
              opacityClass = "opacity-40 grayscale-[0.8]" // Почти труп
              rotIcon = <Ghost size={16} className="text-stone-500" />
              rotStatus = "rotten"
            } else if (hoursOld > 24) {
              opacityClass = "opacity-75" // Подгулявшая
              rotStatus = "stale"
            }

            return (
              <div
                key={task.id}
                className={cn(
                  "relative group flex flex-col gap-2 p-5 rounded-2xl border bg-white shadow-sm transition-all duration-500",
                  opacityClass,
                  // Если гнилая - добавляем эффект "грязи" или просто бордер
                  rotStatus === "rotten" && "border-stone-200 bg-stone-50"
                )}
              >
                {/* Хедер карточки */}
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {rotIcon}
                    <span className={cn(rotStatus === "rotten" && "text-red-900 font-bold")}>
                      {rotStatus === "rotten" ? "ГНИЁТ" : task.type.toUpperCase()}
                    </span>
                  </div>
                  <span>
                    {formatDistanceToNow(new Date(task.planned_at || task.created_at), { locale: ru, addSuffix: true })}
                  </span>
                </div>

                {/* Контент */}
                <div className="flex justify-between items-start gap-4">
                  <h3 className={cn(
                    "text-lg font-semibold leading-snug",
                    rotStatus === "rotten" && "line-through decoration-stone-300 decoration-2"
                  )}>
                    {task.content}
                  </h3>
                </div>

                {/* Футер */}
                <div className="flex items-center gap-2 mt-1">
                  {task.metadata?.source === 'voice' && <Mic size={14} className="text-blue-400" />}
                  {task.is_quick && (
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                      ⚡ БЛИЦ
                    </span>
                  )}
                </div>

                {/* Кнопка "Оживить" (Появляется только при ховере или если гнилая) */}
                {rotStatus === "rotten" && (
                  <button className="absolute -right-2 -top-2 bg-red-500 text-white p-2 rounded-full shadow-lg animate-bounce">
                    <AlertCircle size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}