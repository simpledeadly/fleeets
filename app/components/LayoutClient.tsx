"use client"

import { useHotkeys } from "@/lib/hooks"
import { useCommandCenterStore } from "@/features/command-center/model/store"
import { CommandPalette } from "@/features/command-center/ui/CommandPalette"
import { CaptureBar } from "@/features/command-center/ui/CaptureBar"
import { PendingIndicator } from "@/features/command-center/ui/PendingIndicator"
import BottomNav from "./BottomNav"
import { AnimatePresence, motion } from "framer-motion"

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const { togglePalette, isPaletteOpen } = useCommandCenterStore()

  // Подключаем хоткей
  useHotkeys([['mod+k', togglePalette]])

  return (
    <>
      {children}
      <CommandPalette />

      {/* Обертка для анимации */}
      <AnimatePresence>
        {!isPaletteOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          >
            <PendingIndicator />
            <CaptureBar />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </>
  )
}