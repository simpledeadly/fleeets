'use client'

import { motion } from 'framer-motion'
import { Settings, User, Zap } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { VIEW_REGISTRY, type ViewType } from '@/features/views'
import { usePaywall } from '@/features/paywall'

export function Sidebar() {
  const { currentView, setView, setIsSettingsOpen } = useStore()
  const { isPro } = usePaywall()

  const navItems = Object.entries(VIEW_REGISTRY).map(([key, value]) => ({
    id: key as ViewType,
    ...value,
  }))

  return (
    <aside className="hidden md:flex flex-col w-12 h-screen border-r border-border bg-card p-2 z-50 transition-all duration-200">
      {/* 1. Лого (Центрировано) */}
      <div className="flex justify-center mb-6 mt-2">
        <Zap
          size={24}
          className="text-[#fbbf24] drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]"
        />
      </div>

      {/* 2. Основная навигация */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.name} // Всплывающая подсказка при наведении
              className={cn(
                'relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 group cursor-pointer',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon size={20} strokeWidth={2} />

              {/* Индикатор активной вкладки (точка слева) */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-dot"
                  className="absolute -right-1.5 w-0.5 h-4 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* 3. Нижний блок: Настройки и Юзер */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-border/80 dark:border-border/70">
        <button
          onClick={() => setIsSettingsOpen(true)}
          title="Настройки"
          className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 group cursor-pointer text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Settings size={20} strokeWidth={2} />
        </button>

        {/* Аватар юзера */}
        <div
          className={cn(
            'relative w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
            isPro
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-500'
              : 'border-border bg-secondary text-muted-foreground'
          )}
        >
          <User size={20} />
        </div>
      </div>
    </aside>
  )
}
