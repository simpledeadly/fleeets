'use client'
import { useState } from 'react'
import { Loader2, BrainCircuit } from 'lucide-react'
import { performActivityRetrospective } from '@/features/ai'
import { toast } from 'sonner'

export function AIAnalysisButton() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const result = await performActivityRetrospective()

      if (result.answer) {
        toast('Вердикт ИИ-Аналитика', {
          description: result.answer,
          duration: 30000,
        })
      }
    } catch (e: any) {
      toast.error('Ошибка анализа: ' + e.message)
    } finally {
      setIsAnalyzing(false)
    }
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
