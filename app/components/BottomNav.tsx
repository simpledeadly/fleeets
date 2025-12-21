'use client'

import { useStore } from '@/lib/store'
import { Zap, Lock, ShieldUser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePaywall } from '@/features/paywall'
import { redirect } from 'next/navigation'
import { VIEW_REGISTRY } from '@/features/views'

export default function BottomNav() {
  const { currentView, setView, items } = useStore()
  const { check, isPro } = usePaywall()

  const inboxCount = items.filter((i) => i.status === 'inbox').length

  const tabs = Object.entries(VIEW_REGISTRY).map(([key, { name, icon }]) => ({
    view: key,
    name,
    icon,
  }))

  const handleBlitzClick = () => {
    if (!check('blitz_mode')) return

    // TODO: Здесь будет логика включения блиц-режима
    console.log('⚡️ Блиц-режим активирован (доступно только для PRO)')
    alert('Блиц-режим включен!')
  }

  const handleRedirectToAdminDashboard = () => {
    redirect('/admin')
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-2 p-2 rounded-full bg-card/70 dark:bg-card/90 backdrop-blur-md border shadow-lg shadow-black/5">
        {tabs.map((tab) => {
          const isActive = currentView === tab.view
          return (
            <button
              key={tab.view}
              onClick={() => setView(tab.view as any)}
              aria-label={tab.name}
              className={cn(
                'relative cursor-pointer flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-150',
                isActive
                  ? 'bg-foreground text-background scale-110'
                  : 'text-muted-foreground hover:bg-foreground/5'
              )}
            >
              <tab.icon size={18} strokeWidth={isActive ? 2 : 1.8} />

              {tab.view === 'inbox' && inboxCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-1 ring-card animate-in zoom-in duration-150">
                  {/* {inboxCount > 99 ? '99+' : inboxCount} */}
                  {inboxCount}
                </span>
              )}
            </button>
          )
        })}

        <div className="w-px h-6 bg-muted mx-1" />

        <button
          onClick={handleBlitzClick}
          className="group relative flex cursor-pointer items-center justify-center w-10 h-10 rounded-full text-amber-500 hover:bg-amber-500/10 dark:hover:bg-amber-500/5 transition-colors"
          aria-label="Блиц-режим"
        >
          <Zap
            size={18}
            fill="currentColor"
            className="transition-transform group-active:scale-90"
          />

          {!isPro && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-transparent">
              <Lock strokeWidth={2.4} className="text-muted-foreground" />
            </span>
          )}
        </button>

        {isPro && (
          <>
            <div className="w-px h-6 bg-muted mx-1" />

            <button
              onClick={handleRedirectToAdminDashboard}
              className="group relative flex cursor-pointer items-center justify-center w-10 h-10 rounded-full text-amber-500 hover:bg-amber-500/10 dark:hover:bg-amber-500/5 transition-colors"
              aria-label="Админ-дашборд"
            >
              <ShieldUser
                size={18}
                fill="currentColor"
                className="transition-transform group-active:scale-90"
              />
            </button>
          </>
        )}
      </nav>
    </div>
  )
}
