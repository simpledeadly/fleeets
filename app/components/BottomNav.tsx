'use client'

import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { VIEW_REGISTRY } from '@/features/views'
import { PlusCircle, Settings } from 'lucide-react'
import { createItem } from '@/features/item'
import { useScopeStore } from '@/features/scopes'

export default function BottomNav() {
  const { currentView, setView, items, setIsSettingsOpen } = useStore()
  const { activeScope } = useScopeStore()

  const inboxCount = items.filter((i) => i.status === 'inbox').length

  const tabs = Object.entries(VIEW_REGISTRY).map(([key, { name, icon }]) => ({
    view: key,
    name,
    icon,
  }))

  const handleAddNewItem = async () => {
    setView('inbox')
    await createItem('', activeScope?.id)
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
              <tab.icon size={24} strokeWidth={isActive ? 2 : 1.8} />

              {tab.view === 'inbox' && inboxCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white ring-1 ring-red-500 animate-in zoom-in duration-150">
                  {/* {inboxCount > 99 ? '99+' : inboxCount} */}
                  {inboxCount}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={handleAddNewItem}
          aria-label={'create_inbox'}
          className="relative cursor-pointer flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-150 text-muted-foreground hover:bg-foreground/5"
        >
          <PlusCircle size={24} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          aria-label={'create_inbox'}
          className="relative cursor-pointer flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-150 text-muted-foreground hover:bg-foreground/5"
        >
          <Settings size={24} strokeWidth={1.8} />
        </button>
      </nav>
    </div>
  )
}
