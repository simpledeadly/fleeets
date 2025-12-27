'use client'

import { useStore } from '@/lib/store'
import { VIEW_REGISTRY } from '@/features/views'
import { SettingsModal } from '@/features/settings'

export default function Home() {
  const { isLoading, currentView, isSettingsOpen, setIsSettingsOpen } = useStore()

  const CurrentViewComponent = VIEW_REGISTRY[currentView].component

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen animate-pulse text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Модалка */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <div className="text-center space-y-2 mb-8 animate-in fade-in">
          <h1 className="text-4xl font-bold tracking-tighter">Fleeets</h1>
          <p className="text-muted-foreground text-sm">
            {currentView === 'inbox' ? 'Разбери хаос' : 'Твой план действий'}
          </p>
        </div>

        {CurrentViewComponent ? (
          <CurrentViewComponent />
        ) : (
          <div>View not found</div>
        )}
      </div>
    </main>
  )
}
