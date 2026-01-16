'use client'

import { motion } from 'framer-motion'
import { Settings, User, Zap } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { VIEW_REGISTRY, type ViewType } from '@/features/views'
import { usePaywall } from '@/features/paywall'
import { useScopeStore } from '@/features/scopes' // Import scope store
import { switchScopeAction } from '@/features/scopes/model/actions'

export function Sidebar() {
  const { currentView, setView, setIsSettingsOpen } = useStore()
  const { scopes, activeScope, setActiveScope } = useScopeStore() // Get scopes
  const { isPro } = usePaywall()

  const navItems = Object.entries(VIEW_REGISTRY).map(([key, value]) => ({
    id: key as ViewType,
    ...value,
  }))

  const handleScopeSwitch = async (scope: any) => {
    setActiveScope(scope)
    // setView('project') // Прямой переход УБРАН по просьбе пользователя
    await switchScopeAction(scope.id)
  }

  return (
    <aside className="hidden md:flex flex-col w-12 h-screen border-r border-border bg-card py-2 px-1.5 z-50">
      {/* 1. Лого (Центрировано) */}
      <div className="flex justify-center mb-4 mt-2">
        <Zap
          size={24}
          className="text-[#fbbf24] drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]"
        />
      </div>

      {/* 2. Основная навигация */}
      <nav className="flex-1 flex flex-col items-center gap-1 overflow-y-auto no-scrollbar w-full">
        {/* Divider */}
        <div className="w-4 h-px bg-border my-1" />

        {navItems.map((item) => {
          const isActive = currentView === item.id

          // Render Main Nav Items
          const navButton = (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.name}
              className={cn(
                'relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 group cursor-pointer shrink-0',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon size={20} strokeWidth={2} />
              {isActive && (
                <motion.div
                  layoutId="sidebar-dot"
                  className="absolute -right-1.5 w-0.5 h-4 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          )

          // If this is the HUB/Projects item, render project indicators below it
          if (item.id === 'hub') {
            return (
              <div
                key={item.id}
                className="flex flex-col items-center gap-1 w-full"
              >
                {navButton}

                {/* Divider */}
                {scopes.length > 0 && (
                  <div className="w-4 h-px bg-border my-1" />
                )}

                {/* Project Indicators */}
                <div className="flex flex-col gap-1.5 py-1">
                  {scopes.map((scope) => {
                    const isProjectActive = activeScope?.id === scope.id
                    return (
                      <button
                        key={scope.id}
                        onClick={() => handleScopeSwitch(scope)}
                        title={scope.name}
                        className={cn(
                          'w-2 h-2 rounded-sm cursor-pointer transition-all hover:scale-125',
                          isProjectActive
                            ? 'opacity-100 scale-110 ring-1 ring-primary/40 ring-offset-1 ring-offset-card'
                            : 'opacity-40 hover:opacity-80'
                        )}
                        style={{
                          backgroundColor:
                            scope.theme_config?.accent || '#3b82f6',
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          }

          return navButton
        })}
      </nav>

      {/* 3. Нижний блок: Настройки и Юзер */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-border/80 dark:border-border/70 mt-auto">
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
