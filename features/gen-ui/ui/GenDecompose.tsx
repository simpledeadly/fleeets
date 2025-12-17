"use client"

import { useState } from "react"
import { CheckSquare, Plus, X } from "lucide-react"
import { createItemWithAI } from "@/features/ai/actions"
import { toast } from "sonner"
import { motion } from "framer-motion"

export function GenDecompose({ initialTasks }: { initialTasks: string[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [isSaving, setIsSaving] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Создаем все задачи параллельно
    await Promise.all(tasks.map(t => createItemWithAI(t)))
    setIsSaving(false)
    setIsDone(true)
    toast.success(`${tasks.length} задач создано!`)
  }

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  if (isDone) {
    return (
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2">
        <CheckSquare className="h-5 w-5" />
        <span className="font-medium">Готово! Задачи добавлены в Инбокс.</span>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">План действий</h3>
        <span className="text-xs text-muted-foreground">{tasks.length} шагов</span>
      </div>

      <div className="space-y-2">
        {tasks.map((task, i) => (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={i}
            className="flex gap-2 items-center group"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <input
              value={task}
              onChange={e => {
                const newTasks = [...tasks]
                newTasks[i] = e.target.value
                setTasks(newTasks)
              }}
              className="flex-1 bg-transparent border-b border-transparent focus:border-primary outline-none text-sm py-1 transition-colors"
            />
            <button onClick={() => removeTask(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        {isSaving ? "Создаю..." : <><Plus size={16} /> Создать задачи</>}
      </button>
    </div>
  )
}