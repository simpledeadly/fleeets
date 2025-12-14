"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { usePaywallStore } from "../model/store"
import { PAYWALL_CONFIG } from "../config"
import { paymentService } from "../model/payment.service"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function PaywallModal() {
  const { isOpen, triggeredBy, closePaywall } = usePaywallStore()
  const [isLoading, setIsLoading] = useState(false)

  const content = triggeredBy && PAYWALL_CONFIG[triggeredBy]
    ? PAYWALL_CONFIG[triggeredBy]
    : { title: "Fleeets PRO", description: "Полный контроль над хаосом." }

  const handleUpgrade = async () => {
    setIsLoading(true)
    try {
      const result = await paymentService.checkout()
      if (result.success) {
        closePaywall()
        toast.success("Подписка активирована! 🚀", {
          description: "Добро пожаловать в элиту Fleeets.",
          duration: 5000,
        })
        // Тут можно запустить конфетти 🎉
      } else {
        // Ошибка
        toast.error("Ошибка оплаты", {
          description: result.error
        })
      }
    } catch (e) {
      toast.error(`Что-то пошло не так: ${e}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closePaywall()}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border gap-0">
        <VisuallyHidden>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </VisuallyHidden>

        {/* Header Image / Gradient */}
        <div className="h-32 bg-linear-to-br from-zinc-900 via-zinc-800 to-black p-6 flex flex-col justify-end text-white relative">
          <h2 className="text-2xl font-bold tracking-tight z-10">{content.title}</h2>
          {/* Шум или паттерн на фоне для дороговизны */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-muted-foreground text-lg leading-relaxed">
            {content.description}
          </p>

          <div className="space-y-3">
            <FeatureRow text="Безлимитные задачи и архив" />
            <FeatureRow text="AI-анализ и авто-теги" />
            <FeatureRow text="Блиц-режим (x3 скорость)" />
          </div>

          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full rounded-xl bg-primary text-primary-foreground py-4 font-bold text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Попробовать бесплатно"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            7 дней бесплатно, затем $4.99/мес.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-foreground">
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
        <Check size={12} strokeWidth={3} />
      </div>
      {text}
    </div>
  )
}