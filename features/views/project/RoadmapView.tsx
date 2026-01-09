'use client'

import { useState } from 'react'
import { Item, useStore } from '@/lib/store'
import { Scope } from '@/features/scopes/model/store'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
import { agentIds, useAgent } from '@/features/agents' // Твой хук
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { fetchActiveItems } from '@/lib/data'

// ID Архитектора из базы (в реальном проекте вынеси в константы или ищи по имени)
const ARCHITECT_ID = agentIds.architectAgentId

export function RoadmapView({ scope, items }: { scope: Scope; items: Item[] }) {
  const { runAgent } = useAgent()
  const [goal, setGoal] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const { setItems } = useStore() // Достаем сеттер стейта

  // Фильтруем: тип objective ИЛИ (тип task И нет родителя)
  // Это покажет и Фазы, и высокоуровневые задачи
  const phases = items.filter(
    (i) =>
      (i.type === 'objective' || (i.type === 'task' && !i.parent_id)) &&
      i.status !== 'done'
  )

  const handleGenerate = async () => {
    if (!goal.trim()) return
    setIsGenerating(true)
    const toastId = toast.loading('Архитектор думает...')

    try {
      // 1. Запуск Агента
      const result = await runAgent(ARCHITECT_ID, {
        query: `Цель: ${goal}. Построй структуру.`,
        scope: scope.slug,
        itemId: scope.id, // Передаем ID скоупа как контекст
      })

      // 2. ЯВНЫЙ РЕФЕТЧ ДАННЫХ (Синхронизация)
      toast.loading('Синхронизация...', { id: toastId })
      const supabase = createClient()
      const freshItems = await fetchActiveItems(supabase, scope.id)
      setItems(freshItems)

      toast.success('План построен!', { id: toastId })
      setGoal('')

      // Лог для проверки, что вернул агент
      console.log('🏗 Architect Result:', result)
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{scope.name}</h1>
          <p className="text-sm text-muted-foreground">Стратегическая карта</p>
        </div>
      </div>

      {/* Блок Генерации (Если пусто или просто сверху) */}
      <div className="bg-card border border-border p-4 rounded-xl flex gap-3 items-center shadow-sm">
        <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
          <Sparkles size={20} />
        </div>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Например: Запустить MVP маркетплейса за 2 недели..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !goal}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {isGenerating ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            'Сгенерировать'
          )}
        </button>
      </div>

      {/* Сетка фаз */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className="p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors group flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Phase
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                {phase.status}
              </span>
            </div>

            <h3 className="font-bold text-lg mb-2 leading-tight group-hover:text-primary transition-colors">
              {phase.content}
            </h3>

            <div className="flex-1">
              {/* Здесь потом выведем дочерние задачи */}
              <p className="text-xs text-muted-foreground line-clamp-3">
                {phase.description}
              </p>
            </div>

            {/* Футер карточки */}
            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
              <div className="text-[10px] text-muted-foreground">0 задач</div>
              <button className="text-primary hover:bg-primary/10 p-1 rounded transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
