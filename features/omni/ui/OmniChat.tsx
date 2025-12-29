"use client"

import { useState, useEffect, useRef } from "react"
import { Command, CommandInput, CommandList } from "@/components/ui/command"
import { askBrain } from "@/features/ai"
import { toast } from "sonner"
import { BrainResponse } from './BrainResponse'
import { GEN_UI_REGISTRY, isGenUITool } from '@/features/gen-ui'

export function OmniChat({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery.replace(/^\?/, "").trim())

  // Стейт теперь хранит или обычный ответ, или GenUI данные
  const [brainData, setBrainData] = useState<{ answer: string, sources: any[] } | null>(null)
  const [genUIData, setGenUIData] = useState<{ type: string, data: any } | null>(null)

  const [isThinking, setIsThinking] = useState(false)
  const hasFetched = useRef(false)

  const performSearch = async (text: string) => {
    setIsThinking(true)
    setBrainData(null)
    setGenUIData(null)

    const result = await askBrain(text)

    setIsThinking(false)

    if (result.genUI) {
      setGenUIData(result.genUI)
      // setBrainData({ answer: "Сгенерировал интерфейс:", sources: result.sources || [] })
    } else if (result.answer) {
      setBrainData({ answer: result.answer, sources: result.sources || [] })
    } else {
      toast.error("Мозг не ответил")
    }
  }

  useEffect(() => {
    if (!hasFetched.current && initialQuery.trim().length > 0) {
      hasFetched.current = true

      const t = setTimeout(() => {
        performSearch(initialQuery.replace(/^\?/, "").trim())
      }, 0)

      return () => clearTimeout(t)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isThinking) {
      performSearch(query)
    }
  }

  const ToolComponent = genUIData && isGenUITool(genUIData.type)
    ? GEN_UI_REGISTRY[genUIData.type].component
    : null

  return (
    <Command shouldFilter={false}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleKeyDown}
        className="text-md text-foreground placeholder:text-muted-foreground/50"
        placeholder="Вопрос к базе знаний..."
        autoFocus
      />

      <CommandList className="max-h-200 p-4 overflow-y-auto">

        {/* Индикатор загрузки текстом (опционально) */}
        {isThinking && !brainData && (
          <div className="text-sm text-muted-foreground animate-pulse pl-2">
            Анализирую базу знаний...
          </div>
        )}

        {/* 1. РЕНДЕР ГЕНЕРАТИВНОГО КОМПОНЕНТА */}
        {ToolComponent && genUIData && (
          <div className="mb-6 animate-in fade-in zoom-in-95 duration-150">
            <ToolComponent data={genUIData.data} />
          </div>
        )}

        {/* 2. РЕНДЕР ТЕКСТА */}
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