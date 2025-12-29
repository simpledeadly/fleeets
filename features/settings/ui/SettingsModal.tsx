'use client'

import { createClient } from '../../../lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, CreditCard, Snowflake } from 'lucide-react'
import { usePaywall, paymentService } from '@/features/paywall'
import { toast } from 'sonner'
import { ThemeSelector } from './ThemeSelector'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStore } from '@/lib/store'
import { Switch } from '@/components/ui/switch'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { isSnowing, toggleSnow } = useStore()
  const router = useRouter()
  const supabase = createClient()
  const { isPro } = usePaywall()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleCancelSub = async () => {
    const res = await paymentService.cancelSubscription()
    if (res.success) {
      toast.success('Тариф изменен на Free')
      // Не закрываем модалку, чтобы юзер увидел изменение статуса
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-95 p-0 overflow-hidden bg-card border-border gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Настройки
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-8">
          {/* Block: Appearance */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Оформление
            </h3>
            <ThemeSelector />
          </div>

          {/* Block: Showfall */}
          <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full transition-colors duration-150 ${
                  isSnowing
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                <Snowflake size={18} strokeWidth={1.6} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Новогоднее настроение
                </span>
                <span className="text-xs text-muted-foreground">
                  Да будет снег!
                </span>
              </div>
            </div>
            <Switch checked={isSnowing} onCheckedChange={toggleSnow} />
          </div>

          {/* Block: Subscription */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ваш план
            </h3>

            <div
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-500 ${
                isPro
                  ? 'bg-zinc-900 dark:bg-zinc-50 border-zinc-900'
                  : 'bg-secondary/50 border-border'
              }`}
            >
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <div
                    className={`text-lg font-bold ${
                      isPro ? 'text-white dark:text-black' : 'text-foreground'
                    }`}
                  >
                    {isPro ? 'Fleeets PRO' : 'Free Plan'}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      isPro
                        ? 'text-zinc-400 dark:text-zinc-500'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {isPro ? 'Активна до 14.01.2026' : 'Базовые лимиты'}
                  </div>
                </div>
                {isPro ? (
                  <div className="bg-white/20 dark:bg-black/10 px-2 py-1 rounded text-xs font-bold text-white dark:text-black uppercase">
                    PRO
                  </div>
                ) : (
                  <CreditCard size={20} className="text-muted-foreground" />
                )}
              </div>

              {isPro && (
                <button
                  onClick={handleCancelSub}
                  className="mt-4 text-xs text-zinc-400 hover:text-white dark:text-zinc-500 dark:hover:text-black underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Управлять подпиской
                </button>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-border flex justify-center">
            <button
              onClick={handleLogout}
              className="flex w-full justify-center items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
            >
              <LogOut size={14} />
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
