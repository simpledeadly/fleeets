'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { type Item } from '@/lib/store'
import {
  Calendar,
  FileText,
  Lightbulb,
  FileBox,
  CheckSquare,
  Mic,
  Folders,
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface OmniPreviewProps {
  item: Item | null
  activeTags: string[]
  onToggleTag: (tag: string) => void
}

export function OmniPreview({
  item,
  activeTags,
  onToggleTag,
}: OmniPreviewProps) {
  return (
    <div className="bg-card border-l border-border hidden md:flex flex-col h-full">
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

              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 truncate overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 shrink-0">
                  <Calendar size={14} className="shrink-0 opacity-80" />
                  <span>
                    {format(new Date(item.created_at!), 'd MMM', {
                      locale: ru,
                    })}
                  </span>
                </div>

                {item.status && (
                  <>
                    <div className="h-4 w-px bg-border/60 shrink-0" />
                    <div className="flex items-center gap-1 shrink-0">
                      <TypeIcon type={item.type!} />
                      <span className="capitalize">{item.status}</span>
                    </div>
                  </>
                )}

                {item.ai_tags?.some((t) => t.startsWith('group:')) && (
                  <>
                    <div className="h-4 w-px bg-border/60 shrink-0" />
                    <span className="shrink-0 gap-1 flex items-center text-xs text-muted-foreground">
                      <Folders size={14} className="shrink-0 opacity-80" />
                      <span className="truncate">
                        {item.ai_tags
                          .filter((tag) => tag.startsWith('group:'))
                          .map((tag) => tag.replace('group:', ''))
                          .join(', ')}
                      </span>
                    </span>
                  </>
                )}

                {typeof item.metadata === 'object' &&
                  item.metadata &&
                  ('source' in item.metadata || 'duration' in item.metadata) &&
                  (item.metadata?.source === 'voice' ||
                    item.metadata?.duration) && (
                    <>
                      <div className="h-4 w-px bg-border/60 shrink-0" />
                      <div className="flex items-center gap-1 text-xs text-blue-500">
                        <Mic size={14} />
                        <span>Voice</span>
                      </div>
                    </>
                  )}
              </div>
            </div>

            {/* Тело: Описание и Логи */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-5 no-scrollbar">
              {/* Описание */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Описание
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
              {/* Исходный текст */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Исходный текст
                </div>
                {item.raw_content ? (
                  <div className="text-sm text-foreground/80">
                    <p>{item.raw_content}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">
                    Нет исходного текста
                  </p>
                )}
              </div>
              {/* Теги */}
              {item.ai_tags && item.ai_tags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Теги
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.ai_tags
                      .sort((a, b) => (b.startsWith('group:') ? 1 : -1))
                      .map((tag) => {
                        const isGroup = tag.startsWith('group:')
                        const isActive = activeTags.includes(tag)
                        const displayLabel = isGroup
                          ? tag.replace('group:', '')
                          : tag

                        return (
                          <span
                            key={tag}
                            onClick={() => onToggleTag(tag)}
                            className={cn(
                              'flex items-center text-xs px-1.5 py-0.5 rounded transition-all duration-150 cursor-pointer select-none',
                              isGroup
                                ? 'bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15 text-primary border border-primary/5'
                                : 'bg-muted/60 hover:bg-muted text-accent-foreground/80 border border-primary/5',
                              isActive && 'border-primary/25'
                            )}
                          >
                            {isGroup && (
                              <Folders
                                size={12}
                                className="mr-1 shrink-0 opacity-80"
                              />
                            )}
                            {displayLabel}
                          </span>
                        )
                      })}
                  </div>
                </div>
              )}

              <div className="border-t border-border/60 pt-2 text-xs text-muted-foreground/80 flex flex-col gap-1">
                <p>
                  {item.created_at &&
                    format(new Date(item.created_at), 'Создано d MMMM в H:mm', {
                      locale: ru,
                    })}
                </p>
                {item.triaged_at && (
                  <p>
                    {format(
                      new Date(item.triaged_at),
                      'Разобрано d MMMM в H:mm',
                      {
                        locale: ru,
                      }
                    )}
                  </p>
                )}
                {item.planned_at && (
                  <p>
                    {format(
                      new Date(item.planned_at),
                      'Запланировано d MMMM в H:mm',
                      {
                        locale: ru,
                      }
                    )}
                  </p>
                )}
                {item.completed_at && (
                  <p>
                    {format(
                      new Date(item.completed_at),
                      'Выполнено d MMMM в H:mm',
                      {
                        locale: ru,
                      }
                    )}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Выберите элемент
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'note':
      return <FileText size={14} className="text-blue-500" />
    case 'thought':
      return <Lightbulb size={14} className="text-purple-500" />
    case 'resource':
      return <FileBox size={14} className="text-orange-500" />
    default:
      return <CheckSquare size={14} className="text-emerald-500" />
  }
}
