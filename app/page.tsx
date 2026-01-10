'use client'

import { useStore } from '@/lib/store'
import { VIEW_REGISTRY } from '@/features/views'
import { SettingsModal } from '@/features/settings'
import { Loader2 } from 'lucide-react'
import { useScopeStore } from '@/features/scopes'

export default function Home() {
  const { isSwitching } = useScopeStore()
  const { isLoading, currentView, isSettingsOpen, setIsSettingsOpen } =
    useStore()

  const CurrentViewComponent = VIEW_REGISTRY[currentView].component

  if (isSwitching) {
    return <div className="p-10 animate-pulse">Загрузка контекста...</div>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen animate-pulse text-muted-foreground">
        <Loader2
          size={26}
          strokeWidth={2}
          className="text-foreground animate-spin"
        />
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
