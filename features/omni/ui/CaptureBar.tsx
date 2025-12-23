/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Mic, ArrowUp, BrainCircuit, Loader2, Square, Folder } from 'lucide-react'
import { createItem } from '@/features/item'
import { searchWithAI, transcribeAudio, askBrain } from '@/features/ai'
import { useOmniStore } from '../model/store'
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder'
import { Item, useStore } from '@/lib/store'
import { useDebounce } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { usePaywall } from '@/features/paywall'
import { BrainResponse } from './BrainResponse'

export function CaptureBar() {
  const [text, setText] = useState('')
  const { increment, decrement, togglePalette } = useOmniStore()
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [suggestions, setSuggestions] = useState<Item[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedText = useDebounce(text, 700)
  const { items, setFocusItem } = useStore()
  const { isPro, openPaywall } = usePaywall()
  const [brainMode, setBrainMode] = useState(false)
  const [brainAnswer, setBrainAnswer] = useState<{
    answer: string
    sources: any[]
  } | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  useEffect(() => {
    if (text.trim().startsWith('?')) {
      setBrainMode(true)
    } else if (text.trim() === '') {
      setBrainMode(false)
      setBrainAnswer(null) // Сбрасываем ответ при очистке
    }
  }, [text])

  // Подключаем хук записи
  const { status, audioBlob, startRecording, stopRecording } =
    useAudioRecorder()
  const isRecording = status === 'recording'

  useEffect(() => {
    const handleTranscription = async () => {
      if (audioBlob) {
        setIsTranscribing(true)
        const result = await transcribeAudio(audioBlob)
        if (result.success && result.text) {
          setText((prev) => prev + result.text)
        } else {
          toast.error('Не удалось распознать речь')
        }
        setIsTranscribing(false)
      }
    }
    handleTranscription()
  }, [audioBlob])

  // --- ПРОАКТИВНЫЙ ПОИСК ---
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedText.length > 2 && !brainMode) {
        if (isPro) {
          console.log(
            '⚡️ Проактивный поиск активирован (доступно только для PRO)'
          )
          setIsSearching(true)
          const results = await searchWithAI(debouncedText)
          setSuggestions(results)
          setIsSearching(false)
        } else {
          setSuggestions([
            {
              content: 'Семантический поиск доступен в PRO',
            },
          ] as any)
        }
      } else {
        setSuggestions([])
      }
    }
    performSearch()
  }, [debouncedText])

  // РЕЖИМ ДОБАВЛЕНИЯ ЭЛЕМЕНТА В ПРОЕКТ
  useEffect(() => {
    // Если включен BrainMode (?) - не ищем проекты
    if (brainMode) return

    // Если уже введен синтаксис проекта (есть >), то не подсказываем проекты
    if (text.includes('>')) {
      setSuggestions([])
      return
    }

    const trimmed = text.trim().toLowerCase()

    // Начинаем искать от 2 букв
    if (trimmed.length >= 2) {
      // Ищем среди НЕ удаленных и НЕ инбокса (только устоявшиеся задачи/проекты)
      const matches = items
        .filter(
          (i) =>
            i.status !== 'inbox' &&
            i.status !== 'deleted' &&
            i.content.toLowerCase().includes(trimmed)
        )
        .slice(0, 3) // Берем топ-3

      // 👇 ХАК: Добавляем им спец. флаг, чтобы UI знал, как их рендерить
      const suggestionsWithFlag = matches.map((m) => ({
        ...m,
        isProjectSuggestion: true,
      })) as any

      setSuggestions(suggestionsWithFlag)
    } else {
      setSuggestions([])
    }

    // Отключаем старый RAG-поиск в этом режиме, чтобы не мешал
    // (Удали или закомментируй старый useEffect с searchWithAI, если хочешь заменить его полностью)
  }, [text, items, brainMode])

  const handleSuggestionClick = (item: any) => {
    setText(`${item.content} > `)
    // if (item.isProjectSuggestion) {
    //   // 🔥 АВТОДОПОЛНЕНИЕ ПРОЕКТА
    //   setText(`${item.content} > `)
    //   // Оставляем фокус в инпуте (в идеале найти ref инпута и вызвать focus)
    // } else {
    //   // Старое поведение (открыть задачу)
    //   // setText('')
    //   setSuggestions([])
    //   setFocusItem(item)
    // }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault()
    const content = text.trim()
    if (!content) return

    if (brainMode) {
      // --- ЛОГИКА МОЗГА ---
      setIsThinking(true)
      setBrainAnswer(null) // Очищаем старый
      const query = text.replace('?', '').trim()

      const result = await askBrain(query)

      setIsThinking(false)
      if (result.answer) {
        setBrainAnswer({ answer: result.answer, sources: result.sources || [] })
      } else {
        toast.error('Мозг не ответил')
      }
    } else {
      // 1. Мгновенно обновляем UI
      increment()
      setText('')

      // 2. Отправляем запрос в фоне
      createItem(content)
        .then((result) => {
          // 3. Обрабатываем результат, когда он придет
          if (result.error) {
            toast.error('Ошибка создания', {
              description: 'Задача не была сохранена.',
            })
            setText(content)
          } else {
            if (result.parentTitle) {
              toast.success('Задача добавлена в проект', {
                description: `«${result.parentTitle}» > ${result.item.content}`,
              })
            } else {
              toast.success('Задача в Inbox!')
            }
          }
        })
        .finally(() => {
          // 4. Уменьшаем счетчик в любом случае
          decrement()
        })
    }
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="fixed bottom-25 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-20">
      {/* <AnimatePresence>
        {!brainMode && (suggestions.length > 0 || isSearching) && isPro ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full w-full space-y-0"
          >
            {suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSuggestionClick(item)}
                className="w-full flex justify-between text-left p-2 text-sm bg-card/80 backdrop-blur-3xl border border-b-0 border-border first:rounded-t-xl shadow-md hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-medium">{item.content}</p>
                  <p className="text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <p className="text-muted-foreground font-medium">
                  {item.status}
                </p>
              </button>
            ))}
          </motion.div>
        ) : (
          !brainMode &&
          (suggestions.length > 0 || isSearching) &&
          !isPro && (
            <button
              onClick={() => openPaywall('proactive_semantic_search')}
              className="w-full flex justify-between text-left p-2 text-sm bg-card/80 backdrop-blur-3xl border border-b-0 border-border first:rounded-t-xl shadow-md hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-medium">
                  Семантический поиск доступен в PRO
                </p>
                <p className="text-muted-foreground">
                  Нажмите, чтобы узнать подробнее
                </p>
              </div>
            </button>
          )
        )}

        {brainAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full w-full mb-3 p-4 rounded-2xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/50 shadow-2xl text-white max-h-[60vh] overflow-y-auto no-scrollbar"
          >
            <BrainResponse
              text={brainAnswer.answer}
              sources={brainAnswer.sources}
            />
          </motion.div>
        )}
      </AnimatePresence> */}

      {!brainMode && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full w-full mb-2 space-y-1"
        >
          {suggestions.map((item: any) => (
            <button
              key={item.id}
              onClick={() => handleSuggestionClick(item)}
              className="w-full flex items-center justify-between text-left p-3 text-sm bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Иконка папки для проектов */}
                <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                  {item.isProjectSuggestion ? (
                    <Folder size={18} />
                  ) : (
                    <BrainCircuit size={18} />
                  )}
                </div>

                <div className="flex flex-col truncate">
                  <span className="font-medium truncate">
                    {item.content}
                    {/* Подсказка синтаксиса */}
                    {item.isProjectSuggestion && (
                      <span className="text-muted-foreground opacity-50 ml-1">
                        &gt;
                      </span>
                    )}
                  </span>
                  {/* Показываем статус, чтобы было понятно, откуда проект */}
                  {item.isProjectSuggestion && (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {item.status === 'today' ? 'Focus' : item.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Подсказка клавиши (опционально) */}
              {item.isProjectSuggestion && (
                <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Enter
                </span>
              )}
            </button>
          ))}
        </motion.div>
      )}

      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative flex items-center gap-1 p-1 bg-card/80 backdrop-blur-xl border shadow-lg transition-colors duration-150',
          suggestions.length > 0 ? 'rounded-t-0 rounded-b-3xl' : 'rounded-full',
          brainMode
            ? 'border-amber-500/30 bg-amber-500/10' // Стиль Мозга
            : 'border-border' // Обычный стиль
        )}
      >
        {/* Кнопка Плюс (будущий Cmd+K) */}
        <button
          type="button"
          className="p-2 rounded-full transition-colors cursor-pointer"
        >
          {/* Иконка меняется */}
          <AnimatePresence mode="popLayout">
            {brainMode ? (
              <motion.div
                key="brain"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <BrainCircuit size={18} className="text-amber-400" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                onClick={togglePalette}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Plus size={18} className="text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Инпут */}
        <input
          id="capture-bar-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder={brainMode ? 'Спроси базу знаний...' : 'Новая мысль...'}
          className={cn(
            'flex-1 bg-transparent text-md focus:outline-none transition-colors',
            brainMode
              ? 'text-foreground placeholder:text-secondary'
              : 'placeholder:text-muted-foreground/80'
          )}
        />

        {/* Правые кнопки (Микрофон / Отправить) */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <AnimatePresence>
            {/* 1. Кнопка "Отправить" (если есть текст) */}
            {text.trim() && !isRecording && !isTranscribing && !isThinking ? (
              <motion.button
                key="send"
                type="submit"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="bg-foreground text-background absolute inset-0 flex items-center  justify-center rounded-full transition-colors cursor-pointer"
              >
                <ArrowUp size={18} strokeWidth={2.4} />
              </motion.button>
            ) : (
              <Loader2 className="animate-spin text-amber-400" size={18} />
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
                {isRecording ? (
                  <Square
                    size={14}
                    className="text-red-500"
                    fill="currentColor"
                  />
                ) : (
                  <Mic size={18} strokeWidth={1.8} />
                )}
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
                <Loader2
                  size={18}
                  className="animate-spin text-muted-foreground"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  )
}
