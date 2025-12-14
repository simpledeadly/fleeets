"use client"

import { useStore, type View } from "@/lib/store"
import { Layers, ListTodo, Archive, Zap, Focus, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePaywall } from "@/features/paywall"

export default function BottomNav() {
  const { currentView, setView } = useStore()
  const { check, isPro } = usePaywall()

  const tabs: { name: string; view: View; icon: React.ElementType }[] = [
    { name: "Инбокс", view: "inbox", icon: Layers },
    { name: "Фокус", view: "focus", icon: Focus },
    { name: "План", view: "plan", icon: ListTodo },
    { name: "Архив", view: "archive", icon: Archive },
  ]

  const handleBlitzClick = () => {
    // 👇 ОДНА СТРОЧКА!
    // Если юзер Free, функция check сама откроет модалку с текстом про Блиц
    // и вернет false, прервав выполнение.
    if (!check('blitz_mode')) return

    // TODO: Здесь будет логика включения блиц-режима
    console.log("⚡️ Блиц-режим активирован (доступно только для PRO)")
    alert("Блиц-режим включен!")
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-2 p-2 rounded-full bg-white/80 backdrop-blur-md border shadow-lg shadow-black/5">
        {tabs.map((tab) => {
          const isActive = currentView === tab.view
          return (
            <button
              key={tab.view}
              onClick={() => setView(tab.view)}
              aria-label={tab.name}
              className={cn(
                "relative cursor-pointer flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-150",
                isActive
                  ? "bg-black text-white shadow-md scale-110"
                  : "text-muted-foreground hover:bg-slate-100"
              )}
            >
              <tab.icon size={18} strokeWidth={isActive ? 2 : 1.8} />
            </button>
          )
        })}

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <button
          onClick={handleBlitzClick}
          className="group relative flex cursor-pointer items-center justify-center w-10 h-10 rounded-full text-amber-500 hover:bg-amber-50 transition-colors"
          aria-label="Блиц-режим"
        >
          <Zap size={18} fill="currentColor" className="transition-transform group-active:scale-90" />

          {!isPro && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-transparent">
              {/* Можно иконку замка, но пока просто точка или пусто */}
              <Lock strokeWidth={2.4} className="text-muted-foreground" />
            </span>
          )}
        </button>
      </nav>
    </div>
  )
}