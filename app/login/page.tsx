'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store' // <--- Достаем стор
import { fetchActiveItems } from '@/lib/data' // <--- Достаем функцию загрузки

export default function LoginPage() {
  // 1. ИСПРАВЛЕНИЕ ГИДРАТАЦИИ:
  // Инициализируем null, генерируем только на клиенте
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [status, setStatus] = useState<
    'loading' | 'waiting' | 'success' | 'timeout'
  >('waiting')
  const router = useRouter()
  const supabase = createClient()
  const setItems = useStore((state) => state.setItems) // Прямой доступ к экшену

  // Генерация ID при монтировании
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(crypto.randomUUID())
  }, [])

  // Полллинг
  useEffect(() => {
    if (!sessionId) return

    const startTime = Date.now()
    const MAX_POLLING_TIME = 1000 * 60 * 5 // 5 минут макс

    const interval = setInterval(async () => {
      if (Date.now() - startTime > MAX_POLLING_TIME) {
        clearInterval(interval)
        setStatus('timeout') // Можно добавить такое состояние в UI
        return
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/telegram-auth-poll`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          }
        )

        if (!res.ok) return
        const data = await res.json()

        if (data.access_token && data.refresh_token) {
          clearInterval(interval)
          setStatus('success')

          // А. Устанавливаем сессию
          const { error } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          })

          if (!error) {
            // Б. 🔥 ПРЕДЗАГРУЗКА ДАННЫХ (Magic Moment)
            // Мы загружаем данные, пока юзер видит "Успех! Входим..."
            console.log('Session set. Prefetching data...')
            try {
              const items = await fetchActiveItems(supabase)
              setItems(items) // Заполняем стор данными!
              console.log('Store hydrated manually.')
            } catch (e) {
              console.error('Prefetch error', e)
            }

            // В. Редирект. Данные уже в памяти, перерисовка будет мгновенной.
            router.push('/')
            router.refresh()
          }
        }
      } catch (e) {
        console.error(e)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId, router, supabase, setItems])

  // Пока sessionId генерируется, показываем пустой блок или скелетон,
  // чтобы серверный HTML совпал с первым рендером клиента
  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    )
  }

  const botLink = `https://t.me/fleeets_bot?start=${sessionId}`

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm border p-8 rounded-xl bg-card text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Вход в Fleeets</h1>
          <p className="text-muted-foreground text-sm">
            Нажми кнопку и нажми Старт в боте
          </p>
        </div>

        {status === 'success' ? (
          <div className="text-green-500 font-bold animate-pulse flex flex-col items-center gap-2">
            <span>Успех! Синхронизация...</span>
            {/* Можно добавить маленький спиннер здесь */}
          </div>
        ) : status === 'timeout' ? (
          <div className="text-red-500 font-bold animate-pulse flex flex-col items-center gap-2">
            <span>Timeout</span>
            {/* Можно добавить маленький спиннер здесь */}
          </div>
        ) : (
          <div className="space-y-4">
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#24A1DE] hover:bg-[#208bbf] text-white font-bold py-3 rounded-lg transition-colors"
            >
              Войти через Telegram
            </a>
            <div className="text-xs text-muted-foreground pt-4 border-t">
              <p>Код сессии:</p>
              <p className="font-mono mt-1 opacity-50">{sessionId}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
