'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { type Item } from '@/lib/store'
import { Calendar, AlignLeft, Hash, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export function OmniPreview({ item }: { item: Item | null }) {
  return (
    <div className="border-l bg-card border-border/40 hidden md:flex flex-col h-full">
      <AnimatePresence mode="wait">
        {item ? (
          <motion.div
            key={item.id}
            // initial={{ opacity: 0.6 }}
            // animate={{ opacity: 1 }}
            // exit={{ opacity: 0.6 }}
            // transition={{ duration: 0.05 }}
            className="flex flex-col h-full"
          >
            {/* Хедер: Мета */}
            <div className="p-3 border-b border-border bg-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-lg leading-tight">
                  {item.content}
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>
                    {format(new Date(item.created_at!), 'd MMM', {
                      locale: ru,
                    })}
                  </span>
                </div>
                {item.status && (
                  <div className="flex items-center gap-1">
                    <Activity size={12} />
                    <span className="capitalize">{item.status}</span>
                  </div>
                )}
                <span className="text-xs uppercase font-medium text-muted-foreground border border-border px-1 rounded bg-card/50">
                  {item.type}
                </span>
              </div>
            </div>

            {/* Тело: Описание и Логи */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-5">
              {/* Описание */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <AlignLeft size={12} /> Описание
                </div>
                {item.description ? (
                  <div className="text-sm text-foreground/80">
                    <p>{item.description}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">
                    Нет описания
                  </p>
                )}
              </div>

              {/* Теги */}
              {item.ai_tags && item.ai_tags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Hash size={12} />
                    Теги
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.ai_tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded-xs bg-muted/60 text-accent-foreground/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Выберите элемент
          </div>
          // <motion.div
          //   key="graph"
          //   initial={{ opacity: 0 }}
          //   animate={{ opacity: 1 }}
          //   exit={{ opacity: 0 }}
          //   className="h-full w-full"
          // >
          //   <MemoryGraph />
          // </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
