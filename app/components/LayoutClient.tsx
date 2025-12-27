'use client'

import { useHotkeys } from '@/lib/hooks'
import {
  useOmniStore,
  PendingIndicator,
  Omni,
  CaptureBar,
} from '@/features/omni'
import { AnimatePresence, motion } from 'framer-motion'
import { ItemEditor } from '@/features/item'
import { FocusModal } from '@/features/focus'
import { useStore } from '@/lib/store'
import { getHotkeys } from '@/features/hotkeys'
import { SnowLayer } from '@/features/appearance'
import BottomNav from './BottomNav'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const { isPaletteOpen } = useOmniStore()
  const { focusItem, setFocusItem } = useStore()

  useHotkeys(getHotkeys())

  return (
    <>
      {children}
      <SnowLayer />
      <Omni />

      <FocusModal
        // key={focusItem?.id || 'modal-closed'}
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

      <div className="md:hidden">
        <BottomNav />
      </div>
      <ItemEditor />
    </>
  )
}
