"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Square } from "lucide-react"
import { logFocusSession } from "../model/actions"
import { cn } from "@/lib/utils"

export function Timer({ itemId }: { itemId: string }) {
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const toggleTimer = async () => {
    if (isRunning) {
      // STOP
      if (intervalRef.current) clearInterval(intervalRef.current)
      setIsRunning(false)

      // Сохраняем сессию, если было больше 10 секунд
      if (seconds > 10) {
        await logFocusSession(itemId, seconds)
      }
      // Не сбрасываем секунды сразу, чтобы юзер увидел результат? 
      // Или сбрасываем? Давай пока оставим, чтобы видел сколько наработал.
    } else {
      // START
      setIsRunning(true)
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1)
      }, 1000)
    }
  }

  // Очистка при размонтировании (уходе со страницы)
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      // В идеале тут тоже надо сохранять, если юзер просто закрыл окно
    }
  }, [])

  // Форматирование MM:SS
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
    const s = (totalSeconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className={cn(
      "h-32 rounded-2xl flex flex-col items-center justify-center transition-all duration-150",
      isRunning
        ? "bg-primary/5 border border-primary/20 shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)]"
        : "bg-secondary/20 border border-dashed border-border"
    )}>
      {/* Время */}
      <div className={cn(
        "text-5xl font-mono font-bold tracking-tighter transition-colors",
        isRunning ? "text-primary" : "text-muted-foreground"
      )}>
        {formatTime(seconds)}
      </div>

      {/* Кнопка */}
      <button
        onClick={toggleTimer}
        className={cn(
          "mt-4 flex items-center gap-2 px-6 py-2 rounded-full font-medium text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer",
          isRunning
            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
            : "bg-primary text-primary-foreground hover:opacity-90"
        )}
      >
        {isRunning ? (
          <>
            <Square size={12} fill="currentColor" /> Стоп
          </>
        ) : (
          <>
            <Play size={12} fill="currentColor" /> Старт
          </>
        )}
      </button>

      {isRunning && (
        <div className="absolute top-4 right-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>
      )}
    </div>
  )
}