"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  // ИСПРАВЛЕНИЕ: Генерируем ID один раз при старте, без useEffect
  const [sessionId] = useState(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : '')
  const [status, setStatus] = useState<"loading" | "waiting" | "success">("waiting")
  const router = useRouter()
  const supabase = createClient()

  // Полллинг (Опрос сервера)
  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/telegram-auth-poll`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          }
        )

        if (!res.ok) return

        const data = await res.json()

        // Если пришли токены — ЛОГИНИМСЯ
        if (data.access_token && data.refresh_token) {
          clearInterval(interval)
          setStatus("success")

          const { error } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          })

          if (!error) {
            router.push("/") // Редирект в Инбокс (локально!)
            router.refresh()
          }
        }
      } catch (e) {
        console.error(e)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId, router, supabase.auth])

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

        {status === "success" ? (
          <div className="text-green-500 font-bold animate-pulse">Успех! Входим...</div>
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