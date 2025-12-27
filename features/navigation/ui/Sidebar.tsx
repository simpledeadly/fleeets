'use client'

import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { ViewType } from '@/features/views'
import { VIEW_REGISTRY } from '@/features/views/registry'
import { Settings, User, Zap } from 'lucide-react'
import { usePaywall } from '@/features/paywall'

export function Sidebar() {
  const { currentView, setView, setIsSettingsOpen } = useStore()
  const { isPro } = usePaywall()

  const navItems = Object.entries(VIEW_REGISTRY).map(([key, value]) => ({
    id: key as ViewType,
    ...value,
  }))

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen border-r border-border dark:border-border/40 bg-background backdrop-blur-xl p-2 sticky top-0">
      {/* Лого */}
      <div className="px-2 pt-2 mb-3">
        <Zap
          size={26}
          className="text-[#fbbf24] drop-shadow-[0_0:10px_rgba(251,191,36,0.2)]"
        />
      </div>

      {/* Основная навигация */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'w-full flex items-center gap-1.5 px-2 py-1 rounded-sm text-sm font-medium transition-all duration-150 group relative cursor-pointer',
                isActive
                  ? 'bg-border dark:bg-border/70 text-primary'
                  : 'text-muted-foreground hover:bg-border/50 dark:hover:bg-border/40 hover:text-foreground/80'
              )}
            >
              <item.icon size={18} />
              <span>{item.name}</span>

              {/* {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 w-0.5 h-4 bg-amber-500 rounded-r-full"
                />
              )} */}
            </button>
          )
        })}
      </nav>

      {/* Нижний блок: Настройки и Юзер */}
      <div className="pt-2 border-t border-border/90 dark:border-border/40 space-y-1">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-sm text-sm font-medium transition-all duration-150 group relative cursor-pointer text-muted-foreground hover:text-foreground/80 hover:bg-border/50 dark:hover:bg-border/40"
        >
          <Settings size={18} />
          <span>Настройки</span>
        </button>
        <div className="flex items-center gap-2 p-2 mt-3 bg-border/50 rounded-md border border-border/50 dark:border-border/40">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 dark:bg-amber-500/5 flex items-center justify-center text-amber-500">
            <User size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold truncate">User Name</span>
            <span className="text-[10px] text-muted-foreground truncate font-mono">
              {isPro ? 'PRO Plan' : 'Free Plan'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
