"use client"

import { useState } from 'react'
import { useStore } from "@/lib/store"
import InboxDeck from "./components/InboxDeck"
import PlanList from "./components/PlanList"
import ArchiveList from './components/ArchiveList'
import FocusList from './components/FocusList'
import { SettingsModal } from '@/features/settings'
import { Settings } from 'lucide-react'

export default function Home() {
  const { isLoading, currentView } = useStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen animate-pulse text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-4 left-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors z-40"
      >
        <Settings className="text-neutral-600 dark:text-neutral-300" />
      </button>

      {/* Модалка */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="w-full max-w-md space-y-8 flex flex-col items-center">

        <div className="text-center space-y-2 mb-8 animate-in fade-in">
          <h1 className="text-4xl font-bold tracking-tighter">Fleeets</h1>
          <p className="text-muted-foreground text-sm">
            {currentView === 'inbox' ? 'Разбери хаос' : 'Твой план действий'}
          </p>
        </div>

        {currentView === 'inbox' && <InboxDeck />}
        {currentView === 'plan' && <PlanList />}
        {currentView === 'archive' && <ArchiveList />}
        {currentView === 'focus' && <FocusList />}
      </div>
    </main>
  )
}