"use client"

import { useState } from "react"
import { CheckSquare, Plus, X } from "lucide-react"
import { createItemWithAI } from "@/features/ai/actions"
import { toast } from "sonner"
import { motion } from "framer-motion"

export function GenDecompose({ data }: { data?: string[] }) {
  const [tasks, setTasks] = useState<string[]>(data || [])
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

  const addTask = () => {
    setTasks([...tasks, ""])
  }

  if (isDone) {
    return (
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2">
        <CheckSquare className="h-5 w-5" />
        <span className="font-medium">Готово! Задачи добавлены в Инбокс.</span>
      </div>
    )
  }

  if (tasks.length === 0) return null

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
            transition={{ delay: i * 0.05 }}
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
              className="flex-1 bg-transparent border-b border-transparent focus:border-primary outline-none text-sm py-1 transition-colors duration-150"
              placeholder="Задача..."
              autoFocus={task === ""} // Фокус на новую задачу
            />
            <button onClick={() => removeTask(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity duration-150">
              <X size={14} />
            </button>
          </motion.div>
        ))}
        {tasks.length > 0 && (
          <button onClick={addTask} className="text-[10px] text-muted-foreground hover:text-primary transition-colors duration-150 flex items-center gap-1 pl-3.5">
            <Plus size={10} /> Добавить шаг
          </button>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSaving ? "Создаю..." : <><Plus size={16} /> Создать задачи</>}
      </button>
    </div>
  )
}