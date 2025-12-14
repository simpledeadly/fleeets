"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Square } from "lucide-react"
import { logFocusSession, getItemTotalDuration } from "../model/actions"
import { cn } from "@/lib/utils"

export function Timer({ itemId }: { itemId: string }) {
  const [isRunning, setIsRunning] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    getItemTotalDuration(itemId).then(setTotalSeconds)
  }, [itemId])

  const toggleTimer = async () => {
    if (isRunning) {
      // STOP
      if (intervalRef.current) clearInterval(intervalRef.current)
      setIsRunning(false)

      if (sessionSeconds > 5) {
        await logFocusSession(itemId, sessionSeconds)
        // Добавляем текущую сессию к общему времени, чтобы юзер сразу увидел обновление
        setTotalSeconds(prev => prev + sessionSeconds)
      }
      setSessionSeconds(0) // Сбрасываем сессию
    } else {
      // START
      setIsRunning(true)
      intervalRef.current = setInterval(() => {
        setSessionSeconds(s => s + 1)
      }, 1000)
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Хелпер
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')

    if (h > 0) return `${h}:${m}:${s}`
    return `${m}:${s}`
  }

  // Хелпер для читаемого текста ("2ч 15м")
  const formatTotalHuman = (sec: number) => {
    if (sec === 0) return "Нет записей"
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    if (h > 0) return `${h}ч ${m}м`
    return `${m} мин`
  }

  return (
    <div className={cn(
      "h-36 rounded-2xl flex flex-col items-center justify-center transition-all duration-150 relative overflow-hidden",
      isRunning
        ? "bg-primary/5 border border-primary/20"
        : "bg-secondary/20 border border-dashed border-border"
    )}>
      {/* Время сессии */}
      <div className={cn(
        "text-5xl font-mono font-bold tracking-tighter transition-colors tabular-nums",
        isRunning ? "text-primary" : "text-muted-foreground"
      )}>
        {formatTime(sessionSeconds)}
      </div>

      {/* Общее время (Метаданные) */}
      <div className="mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <span>Всего: {formatTotalHuman(totalSeconds)}</span>
        {isRunning && <span className="text-primary animate-pulse">● Rec</span>}
      </div>

      {/* Кнопка */}
      <button
        onClick={toggleTimer}
        className={cn(
          "absolute bottom-3 right-3 flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm transition-all active:scale-96 shadow-sm cursor-pointer",
          isRunning
            ? "bg-red-500 text-white"
            : "bg-primary text-primary-foreground"
        )}
      >
        {isRunning ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
        {isRunning ? "СТОП" : "СТАРТ"}
      </button>
    </div>
  )
}