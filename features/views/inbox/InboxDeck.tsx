'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { InboxCard } from '../../inbox/ui/InboxCard'
import { getInboxStats } from '../../inbox/model/stats'
import { Zap, Clock, CheckCircle2 } from 'lucide-react'
// import { CoolEmoji } from './CoolEmoji'
// import { Loveduck } from './Loveduck'
// import { YourKickAss } from './YourKickAss'

const EMPTY_MESSAGES = [
  'Инбокс чист, как совесть младенца 🧘‍♂️',
  'Хаос побеждён. Пока что.',
  'Отличная работа! Можно выпить кофе ☕️',
  'Пустота — это начало творчества.',
  'Zero Inbox. Ты сделал это! 🔥',
  'Тишина и покой...',
  'Всё по полочкам. Кайф.',
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
    const throughput =
      inboxStats.inputCount > 0
        ? Math.round((inboxStats.outputCount / inboxStats.inputCount) * 100)
        : inboxStats.outputCount > 0
        ? 100
        : 0

    return (
      <div className="flex flex-col items-center justify-center h-screen mx-auto my-auto text-center animate-in fade-in duration-100">
        <div className="space-y-2 mb-6">
          <h2 className="text-2xl font-black px-8 leading-tight tracking-tighter">
            {randomMessage || 'Входящих нет'}
          </h2>
          <p className="text-muted-foreground/60 text-sm font-medium">
            Ты навёл идеальный порядок
          </p>
        </div>

        {/* Аккуратные блоки метрик */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-6 w-full max-w-2xl">
          {/* Пропускная способность */}
          <div className="flex flex-col items-center p-5 rounded-3xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 group">
            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Zap className="size-5 text-primary" />
            </div>
            <span className="text-2xl font-black text-foreground tabular-nums">
              {inboxStats.outputCount}/{inboxStats.inputCount}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 mt-1">
              Прогресс ({throughput}%)
            </span>
          </div>

          {/* Время в фокусе */}
          <div className="flex flex-col items-center p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 transition-all hover:bg-amber-500/10 group">
            <div className="size-10 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Clock className="size-5 text-amber-500" />
            </div>
            <span className="text-2xl font-black text-foreground tabular-nums">
              {inboxStats.focusMins}м
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 mt-1">
              В потоке
            </span>
          </div>

          {/* Завершено */}
          <div className="flex flex-col items-center p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 transition-all hover:bg-emerald-500/10 group">
            <div className="size-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="size-5 text-emerald-500" />
            </div>
            <span className="text-2xl font-black text-foreground tabular-nums">
              {inboxStats.completedCount}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 mt-1">
              Закрыто за день
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
