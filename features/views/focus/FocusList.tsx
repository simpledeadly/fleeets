'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { BrainCircuit, Loader2, RefreshCw } from 'lucide-react'
import { generateDailyPlan, resetTodayView } from '@/features/planning'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

export function FocusList() {
  const { items, setFocusItem } = useStore()
   
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [theme, setTheme] = useState('')

  // Фильтруем задачи (Today + Planned, например)
  const focusItems = items.filter(
    (i) => i.status === 'today'
  )

  const handleAction = async (action: () => Promise<any>) => {
    setIsLoading(true)
    await action()
    setIsLoading(false)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    const result = await generateDailyPlan(theme)
    setIsGenerating(false)

    if (result?.error) {
      toast.error('Ошибка планирования', {
        description: result.error,
        duration: 10000,
      })
    } else {
      toast.success(`План готов! Задач: ${result.planned}`, {
        description: result.reasoning,
      })
    }
  }

  if (focusItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in space-y-2">
        <h2 className="text-xl font-bold">Фокус пуст</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Позволь AI проанализировать твои цели и задачи, чтобы составить
          оптимальный план.
        </p>
        <div className="flex w-full max-w-sm items-center mt-2 space-x-2">
          <Input
            type="text"
            placeholder="Тема дня (опционально)..."
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center bg-primary text-primary-foreground px-2 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 size={20} className="animate-spin h-4 w-4" />
            ) : (
              <BrainCircuit size={20} className="h-4 w-4" />
            )}
            {/* <span>Спланировать</span> */}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center px-2">
        <h2 className="font-bold">Фокус</h2>
        <button
          onClick={() => handleAction(resetTodayView)}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          title="Сбросить план"
        >
          <RefreshCw
            strokeWidth={1.6}
            size={12}
            className={isLoading ? 'animate-spin' : ''}
          />
          <span>Сбросить</span>
        </button>
      </div>
      <div className="w-full space-y-3">
        {focusItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setFocusItem(item)}
            className="p-4 bg-card border border-border/60 rounded-xl hover:border-border cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
          >
            <div className="font-medium">{item.content}</div>
            {item.description && (
              <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {item.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
