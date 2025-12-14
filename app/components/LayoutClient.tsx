"use client"

import { CaptureBar } from "@/features/command-center/ui/CaptureBar"
import { PendingIndicator } from "@/features/command-center/ui/PendingIndicator"
import BottomNav from "./BottomNav"

export function LayoutClient({ children }: { children: React.ReactNode }) {
  // Теперь все хуки и клиентские компоненты живут здесь
  return (
    <>
      {children}
      <PendingIndicator />
      <CaptureBar />
      <BottomNav />
    </>
  )
}