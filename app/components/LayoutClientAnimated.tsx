'use client'

import { useHotkeys } from '@/lib/hooks'
import { useOmniStore, PendingIndicator, CaptureBar, OmniModal } from '@/features/omni'
import BottomNav from './BottomNav'
import { motion } from 'framer-motion'
import { ItemEditor } from '@/features/item'
import { FocusModal } from '@/features/focus'
import { useStore } from '@/lib/store'
import { getHotkeys } from '@/features/hotkeys'
import { cn } from '@/lib/utils'
import { SnowLayer } from '@/features/appearance'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const { isPaletteOpen } = useOmniStore()
  const { focusItem, setFocusItem } = useStore()

  useHotkeys(getHotkeys())

  const zoomVariants = {
    normal: {
      scale: 1,
      filter: 'blur(0px) brightness(1)',
      borderRadius: '0px',
      y: 0,
    },
    zoomed: {
      scale: 0.95, // Чуть меньше 1, чтобы создать "отступ"
      filter: 'blur(0px) brightness(1)', // Затемнение и размытие
      borderRadius: '24px', // Скругляем углы всего экрана
      y: 10, // Чуть сдвигаем вниз для эффекта перспективы
    },
  }

  return (
    <>
      {/* ФОН (виден по краям при зуме) */}
      {/* <div className="fixed inset-0 bg-black -z-50" /> */}

      {/* 
          ГЛАВНЫЙ КОНТЕЙНЕР ПРИЛОЖЕНИЯ 
          Всё, что должно "уезжать назад", кладем сюда.
      */}
      <motion.div
        initial="normal"
        animate={isPaletteOpen ? 'zoomed' : 'normal'}
        variants={zoomVariants}
        transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 1 }}
        className={cn(
          'relative h-full min-h-screen bg-background overflow-hidden origin-center shadow-2xl',
          // will-change помогает браузеру подготовиться к тяжелой анимации всего экрана
          'will-change-transform'
        )}
      >
        {children}

        {/* Элементы интерфейса тоже уезжают назад */}
        <PendingIndicator />
        <CaptureBar />
        <BottomNav />
      </motion.div>

      {/* 
          ОВЕРЛЕИ (Остаются на переднем плане, не скейлятся) 
          Они лежат ПОВЕРХ motion.div
      */}

      <SnowLayer />
      <OmniModal />

      {/* 2. Другие модалки (они перекрывают всё, им зум не нужен, или можно настроить отдельно) */}
      <FocusModal
        // key={focusItem?.id || 'modal-closed'}
        item={focusItem}
        isOpen={!!focusItem}
        onClose={() => setFocusItem(null)}
      />
      <ItemEditor />
    </>
  )
}
