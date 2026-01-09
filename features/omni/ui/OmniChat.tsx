'use client'

import { useState, useEffect, useRef } from 'react'
import { Command, CommandInput, CommandList } from '@/components/ui/command'
import { toast } from 'sonner'
import { BrainResponse } from './BrainResponse'
import { GEN_UI_REGISTRY, isGenUITool } from '@/features/gen-ui'
import { cn } from '@/lib/utils'
import { agentIds, useAgent } from '@/features/agents'
import { useScopeStore } from '@/features/scopes'

const BRAIN_AGENT_ID = agentIds.orchestratorAgentId

export function OmniChat({
  initialQuery,
  mode,
}: {
  initialQuery: string
  mode: 'standalone' | 'modal'
}) {
  const [query, setQuery] = useState(initialQuery.replace(/^\?/, '').trim())

  // Стейты UI (оставляем как было для совместимости)
  const [brainData, setBrainData] = useState<{
    answer: string
    sources: any[]
  } | null>(null)

  const [genUIData, setGenUIData] = useState<{
    type: string
    data: any
  } | null>(null)

  const hasFetched = useRef(false)

  // Подключаем новый хук
  const { runAgent, isLoading } = useAgent()
  const { activeScope } = useScopeStore()

  const performSearch = async (text: string) => {
    // Сбрасываем старые данные
    setBrainData(null)
    setGenUIData(null)

    try {
      // 1. Вызов Адаптера
      const result = await runAgent(BRAIN_AGENT_ID, {
        query: text,
        scope: activeScope?.slug || 'general', // <-- ТЕПЕРЬ СЮДА ЛЕТИТ РЕАЛЬНЫЙ SLUG
        scopeId: activeScope?.id, // <-- И ID для точного контекста
      })
      console.log('📥 [OMNI_RESULT_PACKET]:', result)

      // 2. Поиск GenUI в действиях (actions)
      const uiStep = result.execution_trace?.find(
        (t) => t.domain === 'ui' && t.status === 'success'
      )

      if (uiStep) {
        const toolId = uiStep.tool.toLowerCase()
        // Если агент вернул UI-компонент
        setGenUIData({
          type: toolId,
          data: uiStep.output_data,
        })
      }

      // 3. Поиск Источников в Трейсе (если был RAG)
      // Мы ищем шаг выполнения, где tool === 'RAG_SEARCH' и статус success
      const ragStep = result.execution_trace?.find(
        (t) => t.tool === 'RAG_SEARCH' && t.status === 'success'
      )
      const sources = ragStep?.output_data || [] // Данные из БД, которые вернул инструмент

      // 4. Установка Текста и Источников
      if (result.content || sources.length > 0) {
        setBrainData({
          answer: result.content,
          sources:
            result.execution_trace?.find((t) => t.tool === 'RAG_SEARCH')
              ?.output_data || [],
        })
      }
    } catch (e) {
      console.error(e)
      toast.error('Ошибка связи с мозгом')
    }
  }

  useEffect(() => {
    const cleanQuery = initialQuery.replace(/^\?/, '').trim()

    if (!hasFetched.current && cleanQuery.length > 0) {
      hasFetched.current = true
      const t = setTimeout(() => {
        performSearch(cleanQuery)
      }, 0)
      return () => clearTimeout(t)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      performSearch(query)
    }
  }

  // Динамический рендер GenUI (без изменений)
  const ToolComponent =
    genUIData && isGenUITool(genUIData.type)
      ? GEN_UI_REGISTRY[genUIData.type].component
      : null

  console.log('🎨 [RENDER_CHECK]:', {
    hasGenUI: !!genUIData,
    type: genUIData?.type,
    isValidTool: genUIData ? isGenUITool(genUIData.type) : false,
  })

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

      <CommandList
        className={cn(
          'p-4 overflow-y-auto',
          mode === 'modal' ? 'h-full max-h-120' : 'min-h-full pb-8'
        )}
      >
        {/* Индикатор загрузки от хука */}
        {isLoading && !brainData && !genUIData && (
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

        {/* 2. РЕНДЕР ТЕКСТА И ИСТОЧНИКОВ */}
        {brainData && (
          <BrainResponse text={brainData.answer} sources={brainData.sources} />
        )}
      </CommandList>
    </Command>
  )
}
