'use client'

import { useStore } from '@/lib/store'
import type { ViewType } from '@/features/views'
import { VIEW_REGISTRY } from '@/features/views/registry'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Settings, User } from 'lucide-react'

export function Sidebar() {
  const { currentView, setView } = useStore()

  const navItems = Object.entries(VIEW_REGISTRY).map(([key, value]) => ({
    id: key as ViewType,
    ...value,
  }))

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r border-border/40 bg-card/30 backdrop-blur-xl p-4 sticky top-0">
      {/* Лого */}
      <div className="px-4 py-6 mb-8">
        <h1 className="text-2xl font-bold tracking-tighter">Fleeets</h1>
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
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon size={18} />
              <span>{item.name}</span>

              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 w-1 h-6 bg-amber-500 rounded-r-full"
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* Нижний блок: Настройки и Юзер */}
      <div className="pt-4 border-t border-border/40 space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-all">
          <Settings size={18} />
          <span>Настройки</span>
        </button>
        <div className="flex items-center gap-3 px-4 py-3 mt-4 bg-secondary/50 rounded-2xl border border-border/20">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
            <User size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold truncate">User Name</span>
            <span className="text-[10px] text-muted-foreground truncate font-mono">
              Pro Plan
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
