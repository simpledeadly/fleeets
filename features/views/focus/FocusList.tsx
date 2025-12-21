'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { BrainCircuit, Loader2, RefreshCw } from 'lucide-react'
import { generateDailyPlan, resetTodayView } from '@/features/planning'
import { toast } from 'sonner'

export function FocusList() {
  const { items, setFocusItem } = useStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Фильтруем задачи (Today + Planned, например)
  const focusItems = items.filter(
    (i) => i.status === 'today' && !i.completed_at
  )

  const handleAction = async (action: () => Promise<any>) => {
    setIsLoading(true)
    await action()
    setIsLoading(false)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    const result = await generateDailyPlan()
    setIsGenerating(false)

    if (result?.error) {
      toast.error('Ошибка планирования', {
        description: result.error,
        duration: 10000,
      })
    }
  }

  if (focusItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in space-y-4">
        <h2 className="text-xl font-bold">Фокус на сегодня пуст</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Позволь AI проанализировать твои цели и задачи, чтобы составить
          оптимальный план.
        </p>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {isGenerating ? (
            <Loader2 className="animate-spin" />
          ) : (
            <BrainCircuit strokeWidth={2} size={20} />
          )}
          {isGenerating ? 'Думаю...' : 'Сгенерировать план'}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center px-2">
        <h2 className="font-bold">Фокус на сегодня</h2>
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
