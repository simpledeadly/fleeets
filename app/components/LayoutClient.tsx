'use client'

import { useHotkeys } from '@/lib/hooks'
import {
  useCommandCenterStore,
  PendingIndicator,
  Omni,
  CaptureBar,
} from '@/features/omni'
import BottomNav from './BottomNav'
import { AnimatePresence, motion } from 'framer-motion'
import { ItemEditor } from '@/features/item'
import { FocusModal } from '@/features/focus'
import { useStore } from '@/lib/store'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const { togglePalette, isPaletteOpen } = useCommandCenterStore()
  const { focusItem, setFocusItem } = useStore()

  // Подключаем хоткей
  useHotkeys([['mod+k', togglePalette]])

  return (
    <>
      {children}
      <Omni />

      <FocusModal
        item={focusItem}
        isOpen={!!focusItem}
        onClose={() => setFocusItem(null)}
      />

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
      <ItemEditor />
    </>
  )
}
