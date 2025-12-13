import { motion } from "framer-motion"
import { Mic, Sparkles, ArrowUpDown, Eye, XCircle, Archive, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { type Item } from "@/lib/store"

interface CardFaceProps {
  task: Item
  isProcessing: boolean
  onToggleType: (e: React.MouseEvent) => void
  onRefine: (e: React.MouseEvent) => void
  onFlip: (e: React.MouseEvent) => void
}

export function CardFace({ task, isProcessing, onToggleType, onRefine, onFlip }: CardFaceProps) {
  return (
    <motion.div
      style={{ backfaceVisibility: "hidden" }}
      className="absolute w-full h-full p-6 rounded-3xl border bg-white shadow-2xl flex flex-col"
    >
      {/* --- Верхняя часть --- */}
      <div className="flex justify-between items-center text-xs text-muted-foreground uppercase font-bold tracking-widest">
        <span>{task.type ?? 'NOTE'}</span>
        <span>{task.created_at ? formatDistanceToNow(new Date(task.created_at), { locale: ru, addSuffix: true }) : 'только что'}</span>
      </div>

      {/* --- Центральная часть (Контент) --- */}
      <div className="flex-1 flex flex-col justify-center gap-2 select-none text-center">
        <h3 className="text-2xl font-bold leading-tight text-balance">{task.content}</h3>
        <p className="text-md font-medium text-neutral-600 leading-tight text-balance">{task.description}</p>

        {(task.metadata as any)?.source === "voice" && (
          <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 py-1.5 px-3 rounded-full w-fit mx-auto border border-blue-100">
            <Mic size={14} />
            <span className="text-xs font-bold">Голос</span>
          </div>
        )}
      </div>

      {/* --- Нижняя часть (Кнопки действий) --- */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <button onClick={onToggleType} className="p-2 rounded-full text-muted-foreground hover:bg-slate-100 transition-colors" aria-label="Сменить тип"><ArrowUpDown size={20} /></button>
        <button onClick={onFlip} className="p-2 rounded-full text-muted-foreground hover:bg-slate-100 transition-colors" aria-label="Показать исходник"><Eye size={20} /></button>
        <button onClick={onRefine} disabled={isProcessing} className="p-2 rounded-full text-muted-foreground hover:bg-slate-100 transition-colors disabled:opacity-50" aria-label="Обработать с помощью AI">
          {isProcessing ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={20} />}
        </button>
      </div>
    </motion.div>
  )
}