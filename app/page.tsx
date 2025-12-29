'use client'

import { useStore } from '@/lib/store'
import { VIEW_REGISTRY } from '@/features/views'
import { SettingsModal } from '@/features/settings'

export default function Home() {
  const { isLoading, currentView, isSettingsOpen, setIsSettingsOpen } =
    useStore()

  const CurrentViewComponent = VIEW_REGISTRY[currentView].component

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen animate-pulse text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Модалка */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <div className="flex flex-1 flex-col">
        {CurrentViewComponent ? (
          <CurrentViewComponent />
        ) : (
          <div>View not found</div>
        )}
      </div>
    </main>
  )
}
