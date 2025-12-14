"use client"

import { useEffect, useState } from "react"
import { X, Check, Loader2 } from "lucide-react"
import { usePaywallStore } from "../model/store"
import { PAYWALL_CONFIG } from "../config"

export function PaywallModal() {
  const { isOpen, triggeredBy, closePaywall } = usePaywallStore()
  const [isLoading, setIsLoading] = useState(false)

  // Получаем тексты в зависимости от того, на что нажал юзер
  // Если triggeredBy пустой (открыли просто так), показываем дефолтный текст
  const content = triggeredBy && PAYWALL_CONFIG[triggeredBy]
    ? PAYWALL_CONFIG[triggeredBy]
    : { title: "Fleeets PRO", description: "Полный контроль над хаосом." }

  // Блокируем скролл страницы, когда модалка открыта
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => { document.body.style.overflow = "unset" }
  }, [isOpen])

  if (!isOpen) return null

  const handleUpgrade = async () => {
    setIsLoading(true)
    // TODO: Здесь будет вызов Stripe/Prodamus
    console.log("Redirecting to checkout...")

    // Эмуляция задержки для UX
    setTimeout(() => {
      setIsLoading(false)
      alert("Здесь должна открыться платежная страница")
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop (Стекло) */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={closePaywall}
      />

      {/* Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">

        {/* Header Image / Gradient */}
        <div className="h-32 bg-linear-to-br from-gray-900 via-gray-800 to-black p-6 flex flex-col justify-end text-white">
          <h2 className="text-2xl font-bold tracking-tight">{content.title}</h2>
        </div>

        <button
          onClick={closePaywall}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 space-y-6">
          <p className="text-gray-600 text-lg leading-relaxed">
            {content.description}
          </p>

          {/* Feature List (Benefits) */}
          <div className="space-y-3">
            <FeatureRow text="Безлимитные задачи и архив" />
            <FeatureRow text="AI-анализ и авто-теги" />
            <FeatureRow text="Блиц-режим (x3 скорость)" />
          </div>

          {/* Action */}
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full rounded-xl bg-black py-4 text-white font-bold text-lg shadow-lg hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Попробовать бесплатно"}
          </button>

          <p className="text-center text-xs text-gray-400">
            7 дней бесплатно, затем $4.99/мес. Отмена в любой момент.
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
        <Check size={12} strokeWidth={3} />
      </div>
      {text}
    </div>
  )
}