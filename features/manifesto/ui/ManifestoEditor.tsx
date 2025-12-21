'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, User, Send } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { getManifesto, getManifestoSuggestion, updateManifesto } from '../model/actions'

// Типы для сообщений
type Message = { role: 'user' | 'assistant'; content: string }

export function ManifestoEditor() {
  const [manifesto, setManifesto] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 1. Загрузка данных при старте
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const initialManifesto = await getManifesto()
      setManifesto(initialManifesto || {})

      // Генерируем первый вопрос от AI
      const suggestion = await getManifestoSuggestion(initialManifesto || {})
      setMessages([{ role: 'assistant', content: suggestion }])
      setIsLoading(false)
    }
    loadData()
  }, [])

  // 2. Обработка отправки
  const handleSubmit = async () => {
    if (!input.trim()) return

    setIsLoading(true)
    const newUserMessage: Message = { role: 'user', content: input }
    const currentMessages = [...messages, newUserMessage]
    setMessages(currentMessages)
    setInput('')

    try {
      // Обновляем манифест на сервере
      const updatedManifesto = await updateManifesto(manifesto, input)
      setManifesto(updatedManifesto)

      // Получаем следующий вопрос
      const nextSuggestion = await getManifestoSuggestion(updatedManifesto)
      setMessages([
        ...currentMessages,
        { role: 'assistant', content: nextSuggestion },
      ])
    } catch (e) {
      toast.error(`Ошибка обновления манифеста: ${e}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Левая колонка: Чат-интервью */}
      <div className="lg:col-span-2 flex flex-col h-[80vh] bg-card/50 border rounded-xl">
        {/* История сообщений */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-4 ${
                msg.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {msg.role === 'assistant' && (
                <Avatar>
                  <AvatarFallback>
                    <Sparkles />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`p-4 rounded-2xl max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <Avatar>
                  <AvatarFallback>
                    <User />
                  </AvatarFallback>
                </Avatar>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <div className="text-sm text-muted-foreground animate-pulse">
              Ассистент думает...
            </div>
          )}
        </div>

        {/* Инпут */}
        <div className="p-4 border-t bg-background rounded-b-xl flex items-center gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Ваш ответ..."
            className="flex-1 resize-none"
            disabled={isLoading}
          />
          <Button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </div>

      {/* Правая колонка: Превью JSON */}
      <div className="lg:col-span-1 bg-card/50 border rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">Твой Манифест</h3>
        <pre className="text-xs bg-secondary/50 p-4 rounded-lg overflow-x-auto h-full">
          {JSON.stringify(manifesto, null, 2)}
        </pre>
      </div>
    </div>
  )
}
