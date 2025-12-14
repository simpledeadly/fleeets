"use client"

import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut, Moon, Sun, Laptop } from "lucide-react"
import { usePaywall, paymentService } from "@/features/paywall"
import { toast } from "sonner"

// Пропсы для открытия/закрытия (пока управляем из родителя, позже сделаем стор)
interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()
  const { isPro } = usePaywall()

  if (!isOpen) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleCancelSub = async () => {
    const res = await paymentService.cancelSubscription()
    if (res.success) {
      toast.success("Подписка отменена", { description: "Вы вернулись на Free тариф" })
      onClose()
    } else {
      toast.error("Ошибка отмены")
    }
  }

  return (
    <div className="fixed inset-0 z-101 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-2xl animate-in zoom-in-95">
        <div className="p-6 space-y-6">
          <h2 className="text-xl font-bold dark:text-white">Настройки</h2>

          {/* Тема */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-500 uppercase">Оформление</p>
            <div className="grid grid-cols-3 gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <ThemeBtn active={theme === 'light'} onClick={() => setTheme('light')} icon={Sun} label="Светлая" />
              <ThemeBtn active={theme === 'dark'} onClick={() => setTheme('dark')} icon={Moon} label="Тёмная" />
              <ThemeBtn active={theme === 'system'} onClick={() => setTheme('system')} icon={Laptop} label="Системная" />
            </div>
          </div>

          {/* Подписка */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-500 uppercase">Подписка</p>
            <div className="p-4 rounded-xl border dark:border-neutral-700 flex items-center justify-between">
              <div>
                <div className="font-semibold dark:text-white">
                  {isPro ? "Fleeets PRO" : "Бесплатный"}
                </div>
                <div className="text-xs text-neutral-500">
                  {isPro ? "Активна до 14.01.2026" : "Лимитированный доступ"}
                </div>
              </div>
              {isPro && (
                <button
                  onClick={handleCancelSub}
                  className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  Отменить
                </button>
              )}
            </div>
          </div>

          {/* Выход */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
          >
            <LogOut size={18} />
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  )
}

function ThemeBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${active
          ? 'bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white'
          : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        }`}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}