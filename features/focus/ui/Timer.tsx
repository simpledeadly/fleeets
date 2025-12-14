"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Square } from "lucide-react"
import { logFocusSession } from "../model/actions"
import { cn } from "@/lib/utils"

export function Timer({ itemId, initialTotalSeconds, isLoading }: {
  itemId: string,
  initialTotalSeconds?: number | null,
  isLoading: boolean
}) {
  const [isRunning, setIsRunning] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalSeconds, setTotalSeconds] = useState(initialTotalSeconds)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setTotalSeconds(initialTotalSeconds)
  }, [initialTotalSeconds])

  const toggleTimer = async () => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setIsRunning(false)
      if (sessionSeconds > 5) {
        await logFocusSession(itemId, sessionSeconds)
        setTotalSeconds(prev => (prev ?? 0) + sessionSeconds)
      }
      setSessionSeconds(0)
    } else {
      setIsRunning(true)
      intervalRef.current = setInterval(() => {
        setSessionSeconds(s => s + 1)
      }, 1000)
    }
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
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
    if (isLoading) return <span className="inline-block h-2 w-20 bg-muted-foreground/10 rounded animate-pulse" />
    if (sec === 0 || sec === null) return "Нет записей"
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

      {/* Общее время */}
      <div className="mt-2 h-4 flex flex-row justify-center items-center text-xs font-medium text-muted-foreground uppercase tracking-wider gap-2">
        <span>Всего: {formatTotalHuman((initialTotalSeconds ?? 0))}</span>
        {/* REC появляется, не двигая текст */}
        <span className={`transition-opacity duration-150 ${isRunning ? 'opacity-100' : 'opacity-30'}`}>
          <span className={`text-primary ${isRunning && 'animate-pulse'}`}>● Rec</span>
        </span>
      </div>

      {/* Кнопка */}
      <button
        onClick={toggleTimer}
        className={cn(
          "absolute bottom-3 right-3 flex items-center justify-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm duration-150 transition-all active:scale-96 shadow-sm cursor-pointer",
          "w-24 h-7",
          isRunning
            ? "bg-red-500 text-white"
            : "bg-primary text-primary-foreground"
        )}
      >
        {isRunning ? (
          <><Square size={10} fill="currentColor" /> СТОП</>
        ) : (
          <><Play size={10} fill="currentColor" /> СТАРТ</>
        )}
      </button>
    </div>
  )
}