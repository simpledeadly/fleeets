'use client'
import { useState } from 'react'
import { Loader2, BrainCircuit } from 'lucide-react'
import { askBrain } from '@/features/ai/actions'
import { toast } from 'sonner'

export function AIAnalysisButton({ summary }: { summary: any }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)

    // 🔥 АГРЕГАЦИЯ ДАННЫХ (Сжимаем 1000 логов в маленький JSON)

    const prompt = `
      Проанализируй мою статистику продуктивности за неделю (JSON).
      Будь краток, но проницателен.
      1. Найди перекосы (на что я трачу время vs что я планирую).
      2. Оцени мою решительность (много ли я удаляю или все тащу в план).
      3. Дай один жесткий совет.
      
      ДАННЫЕ: ${JSON.stringify(summary)}
    `

    // Используем askBrain как транспорт (он умеет ходить в Llama)
    const result = await askBrain(prompt)

    if (result.answer) {
      toast('Вердикт ИИ', {
        description: result.answer,
        duration: 10000, // Читать долго
      })
    } else {
      toast.error('ИИ задумался и промолчал')
    }

    setIsAnalyzing(false)
  }

  return (
    <button
      onClick={handleAnalyze}
      disabled={isAnalyzing}
      className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all duration-150 border border-zinc-800 cursor-pointer"
    >
      {isAnalyzing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <BrainCircuit className="h-4 w-4 text-amber-500" />
      )}
      {isAnalyzing ? 'Анализирую...' : 'AI-Разбор'}
    </button>
  )
}
