'use client'

import { useState } from 'react'
import { applyBlueprint, discardBlueprint } from '../model/actions'
import { toast } from 'sonner'
import { Check, X, ArrowRight, Plus, Trash2, RefreshCw } from 'lucide-react'

export function BlueprintReview({
  blueprint,
  onComplete,
}: {
  blueprint: any
  onComplete: () => void
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const snapshot = blueprint.data_snapshot || {}

  const handleApply = async () => {
    setIsProcessing(true)
    try {
      await applyBlueprint(blueprint.id)
      toast.success('Стратегия применена')
      onComplete()
    } catch (e) {
      toast.error(`Ошибка применения: ${e}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDiscard = async () => {
    if (!confirm('Отклонить этот план?')) return
    setIsProcessing(true)
    try {
      await discardBlueprint(blueprint.id)
      toast.info('План отклонен')
      onComplete()
    } catch (e) {
      toast.error(`Ошибка отмены: ${e}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 mb-6 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-start justify-between mb-4 border-b border-blue-500/20 pb-4">
        <div>
          <h3 className="text-lg font-bold text-blue-100 flex items-center gap-2">
            <RefreshCw size={18} className="animate-spin-slow" />
            Предложение Архитектора
          </h3>
          <p className="text-sm text-blue-200/60 mt-1 max-w-2xl">
            {blueprint.description ||
              'Агент предложил изменения в структуру проекта.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDiscard}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <X size={18} /> Отклонить
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Check size={18} /> Принять стратегию
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* НОВЫЕ ЗАДАЧИ */}
        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
          <div className="text-[10px] uppercase font-bold text-green-400 mb-2 flex items-center gap-2">
            <Plus size={16} /> Добавить ({snapshot.new_items?.length || 0})
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {snapshot.new_items?.map((item: any, i: number) => (
              <div
                key={i}
                className="text-xs bg-green-500/10 border border-green-500/20 p-2 rounded text-green-100"
              >
                <span className="font-bold block text-[10px] opacity-70 mb-0.5">
                  {item.type}
                </span>
                {item.content}
              </div>
            ))}
            {(!snapshot.new_items || snapshot.new_items.length === 0) && (
              <span className="text-xs text-white/20 italic">
                Нет новых элементов
              </span>
            )}
          </div>
        </div>

        {/* ОСТАВИТЬ (Context) */}
        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
          <div className="text-[10px] uppercase font-bold text-blue-400 mb-2 flex items-center gap-2">
            <ArrowRight size={16} /> В плане (
            {snapshot.include_ids?.length || 0})
          </div>
          <div className="text-xs text-white/40 italic">
            Существующие задачи, которые Архитектор считает актуальными. (ID
            скрыты для компактности)
          </div>
        </div>

        {/* УБРАТЬ ИЗ ПЛАНА */}
        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
          <div className="text-[10px] uppercase font-bold text-red-400 mb-2 flex items-center gap-2">
            <Trash2 size={16} /> Убрать из фокуса (
            {snapshot.exclude_ids?.length || 0})
          </div>
          <div className="text-xs text-white/40 italic">
            Задачи, которые будут скрыты из Роадмапа (снят флаг in_roadmap).
          </div>
        </div>
      </div>
    </div>
  )
}
