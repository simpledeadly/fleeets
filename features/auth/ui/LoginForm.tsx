'use client'

import { Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useTelegramAuth } from '../model/use-telegram-auth'

export function LoginForm() {
  const { sessionId, status } = useTelegramAuth()

  if (!sessionId) {
    return (
      <div className="w-full max-w-sm border p-8 rounded-xl bg-card flex items-center justify-center min-h-75">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const botLink = `https://t.me/fleeets_bot?start=${sessionId}`

  return (
    <div className="w-full max-w-sm border p-8 rounded-xl bg-card text-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Вход в Fleeets</h1>
        <p className="text-muted-foreground text-sm">
          Нажми кнопку и нажми Старт в боте
        </p>
      </div>

      <div className="min-h-25 flex items-center justify-center">
        {status === 'success' ? (
          <div className="text-green-500 font-bold animate-pulse">
            Успех! Синхронизация...
          </div>
        ) : status === 'timeout' ? (
          <div className="text-red-500 font-bold uppercase tracking-widest">
            Время вышло
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-2 rounded-2xl border-4 border-secondary shadow-sm">
              <QRCodeSVG
                value={botLink}
                size={180}
                level="M" // Средний уровень коррекции ошибок
                marginSize={1}
              />
            </div>

            <div className="w-full space-y-4">
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
          </div>
        )}
      </div>
    </div>
  )
}
