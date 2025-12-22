'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { InboxCard } from '../../inbox/ui/InboxCard'
import { getInboxStats } from '../../inbox/model/stats'

const EMPTY_MESSAGES = [
  'Инбокс чист, как совесть младенца 🧘‍♂️',
  'Хаос побежден. Пока что.',
  'Отличная работа! Можно выпить кофе ☕️',
  'Пустота — это начало творчества.',
  'Zero Inbox. Ты сделал это! 🔥',
  'Тишина и покой...',
  'Все по полочкам. Кайф.',
  'Красава, Марат!',
]

const STATS_TTL = 30000

export function InboxDeck() {
  const [randomMessage, setRandomMessage] = useState('')
  const items = useStore((state) => state.items)
  const inboxStats = useStore((state) => state.inboxStats)
  const setInboxStats = useStore((state) => state.setInboxStats)

  const inboxTasks = useMemo(
    () => items.filter((item) => item.status === 'inbox'),
    [items]
  )

  const isEmpty = inboxTasks.length === 0

  useEffect(() => {
    if (isEmpty) {
      // 👇 ГЛАВНЫЙ ФИКС: ПРОВЕРКА КЭША
      const now = Date.now()
      const isStale = now - inboxStats.lastUpdated > STATS_TTL

      if (isStale) {
        // Данные протухли — грузим новые
        getInboxStats().then(setInboxStats)
      } else {
        // Данные свежие — ничего не делаем, используем то, что в сторе.
        // "Rendering..." не появится.
      }

      // Логика фразы (как было)
      const t = setTimeout(() => {
        setRandomMessage(
          (prev) =>
            prev ||
            EMPTY_MESSAGES[Math.floor(Math.random() * EMPTY_MESSAGES.length)]
        )
      }, 0)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => {
        setRandomMessage('')
      }, 0)
      return () => clearTimeout(t)
    }
  }, [isEmpty, setInboxStats, inboxStats.lastUpdated])

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center animate-in fade-in space-y-6">
        <div className="text-6xl animate-bounce duration-6000">✨</div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold px-8 leading-relaxed">
            {randomMessage || 'Входящих нет'}
          </h2>
        </div>

        {/* Блок статистики */}
        <div className="flex gap-6 text-sm text-muted-foreground bg-secondary/30 px-6 py-3 rounded-2xl border border-border/50">
          <div className="flex flex-col items-center">
            <span className="font-bold text-foreground text-2xl">
              {inboxStats.today}
            </span>
            <span className="text-[10px] uppercase tracking-wider opacity-70">
              За сегодня
            </span>
          </div>
        </div>
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
