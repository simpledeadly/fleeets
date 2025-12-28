'use client'

import { useState } from 'react'
import { Reorder } from 'framer-motion'
import { useStore } from '@/lib/store'
import { BrainCircuit, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { generateDailyPlan, resetTodayView } from '@/features/planning'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export function FocusList() {
  const { items, setFocusItem, reorderItems, promoteToHero } = useStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [theme, setTheme] = useState('')

  const focusItems = items.filter(
    (i) => i.status === 'today' && !i.completed_at
  )

  const handleReorder = (newOrderIds: string[]) => {
    const reordered = newOrderIds.map((id) => items.find((i) => i.id === id)!)
    // Нам нужно сохранить остальные задачи (не из фокуса) в массиве
    const nonFocusItems = items.filter(
      (i) => i.status !== 'today' || i.completed_at
    )
    reorderItems([...reordered, ...nonFocusItems])
  }

  const handleAction = async (action: () => Promise<any>) => {
    setIsLoading(true)
    await action()
    setIsLoading(false)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    const result = await generateDailyPlan(theme)
    setIsGenerating(false)
    if (result?.error) toast.error('Ошибка', { description: result.error })
  }

  if (focusItems.length === 0) {
    return (
      <div className=" flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in duration-150">
        <div className="space-y-1">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Чистый лист
          </h2>
          <p className="text-muted-foreground text-xs uppercase tracking-widest opacity-50">
            Спланируй день
          </p>
        </div>
        <div className="flex w-full max-w-xs items-center gap-2">
          <Input
            className="border-none bg-secondary/50 rounded-full px-4 h-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
            placeholder="Контекст дня..."
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center bg-foreground text-background w-10 h-10 rounded-full hover:opacity-80 transition-all disabled:opacity-30 cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <BrainCircuit size={16} />
            )}
          </button>
        </div>
      </div>
    )
  }

  // Основной стек: берем первые 3 задачи
  const displayTasks = focusItems.slice(0, 3)
  const otherTasksCount = Math.max(0, focusItems.length - 3)

  return (
    <div className="sm:w-lg md:w-lg lg:w-2xl xl:w-3xl min-h-[90vh] flex flex-col justify-center p-6 relative">
      {/* Кнопка сброса (сверху справа, очень тонко) */}
      <button
        onClick={() => handleAction(resetTodayView)}
        disabled={isLoading}
        className="absolute top-0 right-0 p-3 text-muted-foreground opacity-20 hover:opacity-100 transition-all cursor-pointer"
      >
        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
      </button>

      <Reorder.Group
        axis="y"
        values={focusItems.map((i) => i.id)}
        onReorder={handleReorder}
        className="flex flex-col items-start w-full space-y-16"
      >
        {/* СТЕК ЗАДАЧ (СВЕРХУ ВНИЗ) */}
        <div className="w-full flex flex-col space-y-10">
          {displayTasks.map((item, index) => {
            // Иерархия: index 0 - Hero, 1 - Next, 2 - Distant
            const isMain = index === 0
            const isNext = index === 1

            return (
              <Reorder.Item
                key={item.id}
                value={item.id}
                onClick={() => setFocusItem(item)}
                className={cn(
                  'cursor-pointer transition-all duration-500 hover:opacity-100 group text-left outline-none',
                  isMain
                    ? 'opacity-100'
                    : isNext
                    ? 'opacity-15 hover:opacity-45'
                    : 'opacity-10 hover:opacity-30'
                )}
              >
                <div
                  className="space-y-3 pb-2 border-b border-border dark:border-border/80"
                  onClick={(e) => {
                    if (!isMain) {
                      e.stopPropagation()
                      promoteToHero(item.id)
                    } else {
                      setFocusItem(item)
                    }
                  }}
                >
                  <h1
                    className={cn(
                      'font-bold tracking-tighter leading-[0.9] transition-all duration-150 line-clamp-3',
                      isMain
                        ? 'text-4xl md:text-5xl lg:text-6xl font-black'
                        : isNext
                        ? 'text-xl md:text-2xl'
                        : 'text-md md:text-lg'
                    )}
                  >
                    {item.content}
                  </h1>

                  {isMain && item.description && (
                    <p className="text-muted-foreground/80 text-base text-md lg:text-lg font-mono leading-snug max-w-[85%] line-clamp-3 animate-in fade-in slide-in-from-top-2 duration-150">
                      {item.description}
                    </p>
                  )}
                </div>
              </Reorder.Item>
            )
          })}
        </div>
      </Reorder.Group>

      {/* ОСТАЛЬНЫЕ ЗАДАЧИ (В самом низу, как визуальный "хвост") */}
      {otherTasksCount > 0 && (
        <div className="flex flex-col gap-0 w-50 opacity-5 mt-6 mb-12">
          <p className="flex flex-row text-xs font-bold uppercase tracking-widest mb-1">
            ещё {otherTasksCount} в Бэклоге
          </p>
          {Array.from({ length: Math.min(otherTasksCount, 8) }).map((_, i) => (
            <div
              key={i}
              className="h-[0.1rem] w-full bg-foreground rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  )
}
