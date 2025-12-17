"use client"

import { useState, useEffect, useRef } from "react"
import { Command, CommandInput, CommandList } from "@/components/ui/command"
import { Loader2, BrainCircuit } from "lucide-react"
import { askBrain } from "@/features/ai/actions" // Твой рабочий серверный экшен
import { toast } from "sonner"
import { BrainResponse } from './BrainResponse'

export function OmniChat({ initialQuery }: { initialQuery: string }) {
  // Сразу чистим запрос от "?"
  const [query, setQuery] = useState(initialQuery.replace(/^\?/, "").trim())

  // Стейт для данных (как в CaptureBar)
  const [brainData, setBrainData] = useState<{ answer: string, sources: any[] } | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  // Чтобы не делать запрос дважды при маунте
  const hasFetched = useRef(false)

  const handleSearch = async (textToAsk: string) => {
    if (!textToAsk.trim()) return

    setIsThinking(true)
    setBrainData(null) // Сброс старого ответа

    // Прямой вызов твоей рабочей функции
    const result = await askBrain(textToAsk)

    setIsThinking(false)

    if (result.answer) {
      setBrainData({ answer: result.answer, sources: result.sources || [] })
    } else if (result.error) {
      toast.error("Ошибка AI: " + result.error)
    } else {
      toast.error("Мозг не ответил")
    }
  }

  // Авто-старт при открытии (если уже что-то ввел)
  useEffect(() => {
    if (!hasFetched.current && query.length > 0) {
      hasFetched.current = true
      handleSearch(query)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isThinking) {
      handleSearch(query)
    }
  }

  return (
    <Command shouldFilter={false} className="h-full">
      <div className="relative">
        <div className="absolute left-4 top-3.5 z-10">
          {isThinking ? (
            <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
          ) : (
            <BrainCircuit className="h-5 w-5 text-amber-500" />
          )}
        </div>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          onKeyDown={handleKeyDown}
          className="pl-12 text-amber-500 placeholder:text-amber-500/50"
          placeholder="Вопрос к базе знаний..."
          autoFocus
        />
      </div>

      <CommandList className="max-h-150 p-6 overflow-y-auto">

        {/* Индикатор загрузки текстом (опционально) */}
        {isThinking && !brainData && (
          <div className="text-sm text-muted-foreground animate-pulse pl-2">
            Анализирую базу знаний...
          </div>
        )}

        {/* Вывод ответа через твой компонент */}
        {brainData && (
          <BrainResponse
            text={brainData.answer}
            sources={brainData.sources}
          />
        )}

      </CommandList>
    </Command>
  )
}