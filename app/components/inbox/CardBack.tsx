import { motion } from "framer-motion"
import { Eye } from "lucide-react"
import { type Item } from "@/lib/store"

interface CardBackProps {
  task: Item
  onFlip: (e: React.MouseEvent) => void
}

export function CardBack({ task, onFlip }: CardBackProps) {
  return (
    <motion.div
      onClick={onFlip}
      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
      className="absolute w-full h-full p-6 rounded-3xl border bg-slate-800 text-white shadow-2xl flex flex-col cursor-pointer"
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold uppercase text-slate-400">Исходный текст</h4>
        <button className="p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors" aria-label="Показать обработанный текст"><Eye size={20} /></button>
      </div>
      <p className="flex-1 text-slate-300 overflow-y-auto whitespace-pre-wrap text-sm">
        {task.raw_content}
      </p>
    </motion.div>
  )
}