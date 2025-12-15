"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Mic, ArrowUp, Loader2, Square } from "lucide-react"
import { createItemWithAI, searchWithAI, transcribeAudio } from "@/features/ai"
import { useCommandCenterStore } from '../model/store'
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder'
import { Item, useStore } from '@/lib/store'
import { useDebounce } from '@/lib/hooks'
import { cn } from '@/lib/utils'

export function CaptureBar() {
  const [text, setText] = useState("")
  const { increment, decrement, togglePalette } = useCommandCenterStore()
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [suggestions, setSuggestions] = useState<Item[]>([])
  const [isSearching, setIsSearching] = useState(false) // Локальный лоадер
  const debouncedText = useDebounce(text, 700)
  const { setFocusedItem } = useStore()

  // Подключаем хук записи
  const { status, audioBlob, startRecording, stopRecording } = useAudioRecorder()
  const isRecording = status === 'recording'

  useEffect(() => {
    const handleTranscription = async () => {
      if (audioBlob) {
        setIsTranscribing(true)
        const result = await transcribeAudio(audioBlob)
        if (result.success && result.text) {
          setText(prev => prev + result.text)
        } else {
          toast.error("Не удалось распознать речь")
        }
        setIsTranscribing(false)
      }
    }
    handleTranscription()
  }, [audioBlob])

  // --- ПРОАКТИВНЫЙ ПОИСК ---
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedText.length > 2) {
        setIsSearching(true)
        const results = await searchWithAI(debouncedText)
        setSuggestions(results)
        setIsSearching(false)
      } else {
        setSuggestions([])
      }
    }
    performSearch()
  }, [debouncedText])

  const handleSuggestionClick = (item: Item) => {
    setText("")
    setSuggestions([])
    setFocusedItem(item)
  }

  const handleCreate = async (event?: React.FormEvent) => {
    event?.preventDefault()
    const content = text.trim()
    if (!content) return

    // 1. Мгновенно обновляем UI
    increment()
    setText("")

    // 2. Отправляем запрос в фоне
    createItemWithAI(content)
      .then((result) => {
        // 3. Обрабатываем результат, когда он придет
        if (result.error) {
          toast.error("Ошибка создания", {
            description: "Задача не была сохранена.",
          })
          setText(content)
        }
        toast.success("Задача в Inbox!")
      })
      .finally(() => {
        // 4. Уменьшаем счетчик в любом случае
        decrement()
      })
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="fixed bottom-25 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-100">
      <AnimatePresence>
        {(suggestions.length > 0 || isSearching) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full w-full space-y-0"
          >
            {suggestions.map(item => (
              <button
                key={item.id}
                onClick={() => handleSuggestionClick(item)}
                className="w-full flex justify-between text-left p-2 text-sm bg-card/80 backdrop-blur-3xl border border-b-0 border-border first:rounded-t-2xl shadow-md hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <p>
                  {item.content}
                </p>
                <p>
                  {item.status}
                </p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleCreate}
        className={cn("relative flex items-center gap-2 p-2 dark:bg-card/80 backdrop-blur-xl border border-border shadow-lg", suggestions.length > 0 ? "rounded-t-0 rounded-b-3xl" : "rounded-full")}
      >
        {/* Кнопка Плюс (будущий Cmd+K) */}
        <button
          type="button"
          onClick={() => togglePalette()}
          className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Plus size={18} className="text-muted-foreground" />
        </button>

        {/* Инпут */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isRecording ? "Говорите..." : isTranscribing ? "Расшифровка..." : "Новая мысль..."}
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/80"
          disabled={isRecording || isTranscribing}
        />

        {/* Правые кнопки (Микрофон / Отправить) */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <AnimatePresence>
            {/* 1. Кнопка "Отправить" (если есть текст) */}
            {text.trim() && !isRecording && !isTranscribing && (
              <motion.button
                key="send"
                type="submit"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="bg-foreground text-background absolute inset-0 flex items-center  justify-center rounded-full transition-colors cursor-pointer">
                <ArrowUp size={18} strokeWidth={2.4} />
              </motion.button>
            )}

            {/* 2. Кнопка "Микрофон / Стоп" (если текста нет) */}
            {!text.trim() && !isTranscribing && (
              <motion.button
                key="mic"
                type="button"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                onClick={handleMicClick}
                className="p-2 rounded-full text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                {isRecording ? <Square size={14} className="text-red-500" fill="currentColor" /> : <Mic size={18} strokeWidth={1.8} />}
              </motion.button>
            )}

            {/* 3. Индикатор транскрипции */}
            {isTranscribing && (
              <motion.div
                key="transcribing"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form >
    </div >
  )
}