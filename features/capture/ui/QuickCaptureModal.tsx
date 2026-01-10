'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuickCaptureStore } from '../model/store'
import { createItem } from '@/features/item/model/actions'
import { useStore } from '@/lib/store' // Твой глобальный стор элементов
import { Loader2, CornerDownLeft, Box, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export function QuickCaptureModal() {
  const { isOpen, targetScopeId, targetScopeName, closeCapture } =
    useQuickCaptureStore()
  const { addItem } = useStore() // Для оптимистичного обновления
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Фокус при открытии
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setContent('') // Очищаем при закрытии
    }
  }, [isOpen])

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeCapture()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeCapture])

  const handleSubmit = async () => {
    if (!content.trim()) return
    setIsSubmitting(true)

    try {
      // Вызываем твой экшен создания
      const res = await createItem(content, targetScopeId)

      if (res.error) throw new Error(res.error)
      if (res.item) {
        // Оптимистичное добавление (если мы сейчас в этом же скоупе)
        addItem(res.item)
        toast.success('Сохранено в ' + targetScopeName)
      }

      closeCapture()
    } catch (e) {
      toast.error(`Ошибка создания: ${e}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCapture}
            className="absolute inset-0 bg-black/60"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
          >
            <div className="p-2 flex items-center gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  targetScopeId
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-zinc-500/10 text-zinc-400'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : targetScopeId ? (
                  <Box size={20} />
                ) : (
                  <Globe size={20} />
                )}
              </div>

              <input
                ref={inputRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder={`Добавить задачу в ${targetScopeName}...`}
                className="flex-1 bg-transparent text-md outline-none placeholder:text-muted-foreground/50 h-10"
              />
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-background/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span
                  className={targetScopeId ? 'text-blue-400' : 'text-zinc-400'}
                >
                  Context: {targetScopeName}
                </span>
                <span className="text-muted-foreground/40">Enter to save</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <span>return</span> <CornerDownLeft size={16} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
