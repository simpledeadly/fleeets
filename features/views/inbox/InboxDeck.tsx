'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { InboxCard } from '../../inbox/ui/InboxCard'
import { getInboxStats } from '../../inbox/model/stats'
// import { CoolEmoji } from './CoolEmoji'
// import { Loveduck } from './Loveduck'
// import { YourKickAss } from './YourKickAss'

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

// const EMPTY_STICKERS = [
//   <CoolEmoji key={1} />,
//   <Loveduck key={2} />,
//   <YourKickAss key={3} />,
// ]

const STATS_TTL = 30000

export function InboxDeck() {
  const [randomMessage, setRandomMessage] = useState('')
  // const [randomSticker, setRandomSticker] = useState<any>()
  const items = useStore((state) => state.items)
  const inboxStats = useStore((state) => state.inboxStats)
  const setInboxStats = useStore((state) => state.setInboxStats)
  const [isGridMode, setIsGridMode] = useState(false)
  const [forcedTopId, setForcedTopId] = useState<string | null>(null)

  const inboxTasks = useMemo(() => {
    const sorted = items
      .filter((item) => item.status === 'inbox')
      // Старые сверху
      .sort(
        (a, b) =>
          new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
      )

    // Если мы выбрали карту в сетке, переносим ее в начало массива временно
    if (forcedTopId) {
      const selectedIndex = sorted.findIndex((i) => i.id === forcedTopId)
      if (selectedIndex > -1) {
        const [selected] = sorted.splice(selectedIndex, 1)
        sorted.unshift(selected)
      }
    }
    return sorted
  }, [items, forcedTopId])

  const isEmpty = inboxTasks.length === 0

  useEffect(() => {
    if (isEmpty) {
      const g = setTimeout(() => {
        setIsGridMode(false)
      }, 0)
      const now = Date.now()
      const isStale = now - inboxStats.lastUpdated > STATS_TTL

      if (isStale) {
        // Данные протухли — грузим новые
        getInboxStats().then(setInboxStats)
      }

      // Логика фразы и стикера
      const t = setTimeout(() => {
        setRandomMessage(
          (prev) =>
            prev ||
            EMPTY_MESSAGES[Math.floor(Math.random() * EMPTY_MESSAGES.length)]
        )
        // setRandomSticker(
        //   (prev: JSX.Element) =>
        //     prev ||
        //     EMPTY_STICKERS[Math.floor(Math.random() * EMPTY_STICKERS.length)]
        // )
      }, 0)
      return () => {
        clearTimeout(g)
        clearTimeout(t)
      }
    } else {
      const t = setTimeout(() => {
        setRandomMessage('')
      }, 0)
      return () => clearTimeout(t)
    }
  }, [isEmpty, setInboxStats, inboxStats.lastUpdated])

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-screen mx-auto my-auto text-center animate-in fade-in space-y-3">
        {/* {randomSticker || <CoolEmoji />} */}

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
            <span className="text-xs uppercase tracking-wider opacity-70">
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
    <div className="relative w-[94vw] md:w-100 h-screen m-auto flex items-center justify-center">
      {/* РЕЖИМ СЕТКИ (OVERVIEW) */}
      {isGridMode ? (
        <div className="min-w-[96vw] h-screen px-4 pt-20 pb-20 overflow-y-auto custom-scrollbar">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-20">
            {inboxTasks.map((task) => (
              <motion.div
                key={task.id}
                layoutId={`card-${task.id}`} // 🔥 МАГИЯ: Связывает карты в сетке и в колоде
                onClick={() => {
                  setForcedTopId(task.id) // Делаем её первой
                  setIsGridMode(false) // Возвращаемся в колоду
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="dark:bg-muted-foreground/3 border border-border/90 p-4 rounded-2xl h-40 flex flex-col justify-between cursor-pointer hover:border-muted-foreground/40 dark:hover:border-muted-foreground/30 dark:hover:bg-muted-foreground/5 transition-colors duration-100 shadow-xs"
              >
                <span className="text-sm font-bold line-clamp-3">
                  {task.content}
                </span>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-muted-foreground uppercase">
                    {task.type}
                  </span>
                  {task.is_quick && (
                    <span className="text-xs text-amber-500">⚡️</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          {/* Кнопка закрытия сетки (на всякий случай) */}
          <button
            onClick={() => setIsGridMode(false)}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 border border-border dark:border-border/60 bg-card/80 backdrop-blur-lg text-foreground px-4 py-2 rounded-full shadow-md text-xs font-semibold z-50 cursor-pointer transition-all duration-200 animate-in fade-in"
          >
            Вернуться к колоде
          </button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {visibleTasks.map((task, index) => {
            const isTop = index === visibleTasks.length - 1
            const stackIndex = visibleTasks.length - 1 - index

            if (!isTop) {
              // Твоя анимация задних карт
              return (
                <motion.div
                  key={task.id}
                  layoutId={`card-${task.id}`} // Связь с сеткой
                  layout // Плавное перемещение в стеке
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
              // <div key={task.id}>
              <InboxCard
                key={task.id}
                item={task}
                isTop={isTop}
                index={inboxTasks.indexOf(task)} // Для счетчика
                total={inboxTasks.length} // Для счетчика
                onSwipeDown={() => setIsGridMode(true)}
              />
              // </div>
            )
          })}
        </AnimatePresence>
      )}
    </div>
  )
}
