'use client'

import {
  CheckCircle2,
  CalendarDays,
  StickyNote,
  Lightbulb,
  CheckSquare,
  Mic,
  Hash,
  FileText,
  FileBox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { Item, useStore } from '@/lib/store'

type SimilarItem = Item & { similarity: number }

interface SimilarItemsProps {
  items: SimilarItem[] | null
  isLoading: boolean
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'note':
      return <StickyNote size={14} className="text-blue-500" />
    case 'thought':
      return <Lightbulb size={14} className="text-purple-500" />
    case 'resource':
      return <FileBox size={14} className="text-orange-500" />
    default:
      return <CheckSquare size={14} className="text-emerald-500" />
  }
}

function SkeletonCard() {
  return (
    <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 animate-pulse">
      <div className="h-4 bg-muted-foreground/10 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-muted-foreground/10 rounded w-1/2"></div>
      <div className="mt-2 pt-2 border-t border-border/30 flex justify-between items-center">
        <div className="h-3 bg-muted-foreground/10 rounded w-1/3"></div>
        <div className="h-4 bg-muted-foreground/10 rounded w-1/4"></div>
      </div>
    </div>
  )
}

export function SimilarItems({ items, isLoading }: SimilarItemsProps) {
  const { setFocusItem } = useStore()

  return (
    <motion.div layout="position" className="space-y-3">
      <div className="flex flex-row items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Похожее ({items?.length ?? '...'})</span>
      </div>

      {/* Показываем скелет, только если isLoading */}
      {isLoading && (
        <div className="grid gap-2">
          <SkeletonCard />
        </div>
      )}

      {/* Показываем данные, только если загрузка НЕ идет */}
      {!isLoading && items && items.length > 0 && (
        <motion.div
          className="grid gap-2"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {items.map((item) => (
            <motion.div
              key={item.id}
              variants={{
                hidden: { opacity: 0, y: 0 },
                visible: { opacity: 1, y: 0 },
              }}
              onClick={() => setFocusItem(item)}
              className="group relative p-3 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/60 transition-all cursor-pointer" // убираем animate-in, Framer Motion рулит
            >
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  {/* Контент */}
                  <p
                    className={cn(
                      'text-md font-medium line-clamp-2',
                      item.status === 'done' &&
                        'line-through text-muted-foreground'
                    )}
                  >
                    {item.content}
                  </p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {item.description}
                    </p>
                  )}

                  {/* ТИП ЭЛЕМЕНТА (Мини-бэйджик) */}
                  <div className="flex items-center gap-1.5">
                    {item.type && (
                      <div className="flex items-center gap-1 bg-background/50 px-1.5 py-0.5 rounded text-xs font-medium text-muted-foreground border border-border/50">
                        <TypeIcon type={item.type} />
                        <span className="capitalize">{item.type}</span>
                      </div>
                    )}

                    {/* ТЕГИ И АССЕТЫ */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* 1. Если это было голосовое (source: 'voice' или 'telegram') */}
                      {typeof item.metadata === 'object' &&
                        item.metadata &&
                        ('source' in item.metadata ||
                          'duration' in item.metadata) &&
                        (item.metadata?.source === 'voice' ||
                          item.metadata?.duration) && (
                          <div className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20">
                            <Mic size={14} />
                            <span>Voice</span>
                          </div>
                        )}

                      {/* 2. Теги (первые 2, чтобы не захламлять) */}
                      {item.ai_tags?.slice(0, 2).map((tag: string) => (
                        <div
                          key={tag}
                          className="flex items-center gap-0.5 text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground"
                        >
                          <Hash size={12} />
                          <span>{tag}</span>
                        </div>
                      ))}

                      {/* 3. Сниппет лога (если есть) */}
                      {item.execution_log && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/80 italic">
                          <FileText size={12} />
                          <span className="max-w-37 truncate">
                            {item.execution_log}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Статус (Справа) */}
                {item.status === 'done' && item.type === 'task' ? (
                  <CheckCircle2
                    size={16}
                    className="text-green-500 shrink-0 mt-0.5"
                  />
                ) : (
                  item.type === 'task' && (
                    <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/50 shrink-0 mt-0.5" />
                  )
                )}
              </div>

              {/* Footer */}
              <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <CalendarDays size={12} />
                  <span>
                    {item.completed_at
                      ? `Завершено ${formatDistanceToNow(
                          new Date(item.completed_at),
                          { addSuffix: true, locale: ru }
                        )}`
                      : item.created_at
                      ? formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })
                      : ''}
                  </span>
                </div>

                <span className="text-xs font-medium text-amber-500/80 bg-amber-500/8 px-1.5 py-0.5 rounded">
                  {(item.similarity * 100).toFixed(0)}%
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div className="p-4 text-center border border-dashed border-border rounded-xl flex flex-col gap-1">
          {/* <p className="text-sm text-muted-foreground font-medium">AI Context пуст</p> */}
          <p className="text-sm text-muted-foreground/80">
            Нейросеть не нашла похожие элементы
          </p>
        </div>
      )}
    </motion.div>
  )
}
