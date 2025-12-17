"use client"

import { useState, useEffect, useRef } from "react"
import { Command, CommandInput, CommandList } from "@/components/ui/command"
import { Loader2, BrainCircuit } from "lucide-react"
import { askBrain } from "@/features/ai/actions"
import { toast } from "sonner"
import { BrainResponse } from './BrainResponse'
import { GenDecompose } from '@/features/gen-ui'

export function OmniChat({ initialQuery }: { initialQuery: string }) {
  // Сразу чистим запрос от "?"
  const [query, setQuery] = useState(initialQuery.replace(/^\?/, "").trim())

  // Стейт для данных (как в CaptureBar)
  const [brainData, setBrainData] = useState<{ answer: string, sources: any[] } | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  const [genUIData, setGenUIData] = useState<{ type: string, data: any } | null>(null)

  // Чтобы не делать запрос дважды при маунте
  const hasFetched = useRef(false)

  const handleSearch = async (textToAsk: string) => {
    if (!textToAsk.trim()) return

    setIsThinking(true)
    setBrainData(null) // Сброс старого ответа
    setGenUIData(null) // Сброс

    // Прямой вызов твоей рабочей функции
    const result = await askBrain(textToAsk)

    setIsThinking(false)

    if (result.genUI) {
      setGenUIData(result.genUI)
      setBrainData({ answer: "Вот план действий:", sources: result.sources || [] }) // Опционально
    } else if (result.answer) {
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
      <CommandInput
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleKeyDown}
        className="text-sm text-foreground placeholder:text-muted-foreground/50"
        placeholder="Вопрос к базе знаний..."
        autoFocus
      />

      <CommandList className="max-h-150 p-4 overflow-y-auto">

        {/* Индикатор загрузки текстом (опционально) */}
        {isThinking && !brainData && (
          <div className="text-sm text-muted-foreground animate-pulse pl-2">
            Анализирую базу знаний...
          </div>
        )}

        {/* Рендер GenUI */}
        {genUIData?.type === 'decomposition' && (
          <div className="mb-6">
            <GenDecompose initialTasks={genUIData.data} />
          </div>
        )}

        {/* Вывод ответа через твой компонент */}
        {!genUIData && brainData && (
          <BrainResponse
            text={brainData.answer}
            sources={brainData.sources}
          />
        )}

      </CommandList>
    </Command>
  )
}