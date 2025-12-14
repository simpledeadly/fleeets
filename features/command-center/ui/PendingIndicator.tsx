"use client"
import { Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePendingStore } from '../model/store'

export function PendingIndicator() {
  const { count } = usePendingStore()

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-42 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div className="flex items-center gap-2 text-xs font-medium bg-white/80 dark:bg-black/80 backdrop-blur-md border border-white/20 shadow-lg px-3 py-1.5 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">
              {count > 1 ? `Создание (${count})...` : 'Создание...'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
