'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { InboxCard } from './InboxCard'

export function InboxDeck() {
  const allItems = useStore((state) => state.items)

  // Твоя логика фильтрации
  const inboxTasks = useMemo(
    () => allItems.filter((item) => item.status === 'inbox'),
    [allItems]
  )

  if (inboxTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in">
        <div className="text-6xl mb-4">🧘‍♂️</div>
        <h2 className="text-2xl font-bold">Инбокс пуст</h2>
      </div>
    )
  }

  // Твоя логика стека (3 карточки)
  const visibleTasks = inboxTasks.slice(0, 3).reverse()

  return (
    <div className="relative w-full max-w-sm h-96 flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        {visibleTasks.map((task, index) => {
          const isTop = index === visibleTasks.length - 1
          const stackIndex = visibleTasks.length - 1 - index

          if (!isTop) {
            // Твоя анимация задних карт
            return (
              <motion.div
                key={task.id}
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{
                  scale: 1 - stackIndex * 0.05,
                  y: stackIndex * 15,
                  opacity: 1 - stackIndex * 0.3,
                  zIndex: -stackIndex,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute w-full h-96 rounded-3xl border bg-card shadow-sm pointer-events-none"
              />
            )
          }

          return (
            <InboxCard
              key={task.id}
              item={task}
              isTop={isTop}
              index={inboxTasks.indexOf(task)} // Для счетчика
              total={inboxTasks.length} // Для счетчика
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}
