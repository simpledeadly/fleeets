'use client'

import { useEffect } from 'react'
import { useHotkeys } from '@/lib/hooks'
import {
  useOmniStore,
  PendingIndicator,
  OmniModal,
  CaptureBar,
} from '@/features/omni'
import { AnimatePresence, motion } from 'framer-motion'
import { ItemEditor } from '@/features/item'
import { FocusModal } from '@/features/focus'
import { useStore } from '@/lib/store'
import { getHotkeys } from '@/features/hotkeys'
import { SnowLayer } from '@/features/appearance'
import { QuickCaptureModal } from '@/features/capture'
import { BottomNav } from '@/features/navigation'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const { isPaletteOpen } = useOmniStore()
  const { focusItem, setFocusItem, currentView, clearSelection } = useStore()

  // 1. Очистка выделения при переключении страниц или ЗАКРЫТИИ палитры
  useEffect(() => {
    if (!isPaletteOpen) clearSelection()
  }, [isPaletteOpen, clearSelection])

  useEffect(() => {
    clearSelection()
  }, [currentView, clearSelection])

  // 2. Всегда слушаем mod+k для переключения (открыть/закрыть)
  const allHotkeys = getHotkeys()
  const toggleOmniHotkey = allHotkeys.filter(([key]) => key === 'mod+k')
  const navigationHotkeys = allHotkeys.filter(([key]) => key !== 'mod+k')

  useHotkeys(toggleOmniHotkey)
  useHotkeys(navigationHotkeys, {
    enabled: !isPaletteOpen,
  })

  return (
    <>
      {children}
      <SnowLayer />
      <OmniModal />
      <QuickCaptureModal />

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
