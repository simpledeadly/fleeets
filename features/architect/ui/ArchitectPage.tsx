'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  Check,
  ArrowRight,
  Inbox,
  ChevronDown,
  Trash2,
  Plus,
} from 'lucide-react'
import {
  discoverTaxonomy,
  sortItemsByTaxonomy,
  applyArchitectStructure,
  type TaxonomyRoot,
} from '../model/actions'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ArchitectPage() {
  // --- STATE ---
  const [step, setStep] = useState<'input' | 'review' | 'result'>('input')

  // Data
  const [hint, setHint] = useState('')
  const [draftRoots, setDraftRoots] = useState<TaxonomyRoot[]>([])
  const [structure, setStructure] = useState<
    { group: string; items: any[] }[] | null
  >(null)

  const { setFocusItem } = useStore()

  // Loading States
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [isSorting, setIsSorting] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // Expand State for Review
  const [expandedRoot, setExpandedRoot] = useState<string | null>(null)

  // --- HANDLERS ---

  // 1. DISCOVER
  const handleDiscover = async () => {
    if (!hint.trim()) {
      toast.error('Введите контекст')
      return
    }
    setIsDiscovering(true)
    try {
      const res = await discoverTaxonomy(hint)
      if (res.error) {
        toast.error(res.error)
      } else if (res.roots) {
        setDraftRoots(res.roots)
        setStep('review')
        toast.success('Проекты найдены! Проверьте их.')
      }
    } catch (e) {
      toast.error(`Ошибка анализа: ${e}`)
    } finally {
      setIsDiscovering(false)
    }
  }

  // 2. SORT
  const handleSort = async () => {
    setIsSorting(true)
    try {
      const res = await sortItemsByTaxonomy(draftRoots)
      if (res.error) {
        toast.error(res.error)
      } else if (res.structure) {
        setStructure(res.structure)
        setStep('result')
        toast.success('Задачи разложены!')
      }
    } catch (e) {
      toast.error(`Ошибка сортировки: ${e}`)
    } finally {
      setIsSorting(false)
    }
  }

  // 3. APPLY
  const handleApply = async () => {
    if (!structure) return
    if (
      !confirm(
        `Применить структуру к ${structure.reduce(
          (acc, g) => acc + g.items.length,
          0
        )} задачам?`
      )
    )
      return

    setIsApplying(true)
    try {
      const res = await applyArchitectStructure(structure)
      if (res.success) {
        toast.success('Готово! Структура применена.')
        setStep('input')
        setHint('')
        setStructure(null)
      }
    } catch (e) {
      toast.error(`Ошибка сохранения: ${e}`)
    } finally {
      setIsApplying(false)
    }
  }

  // --- REVIEW EDITING HELPERS ---
  const updateRoot = (idx: number, field: keyof TaxonomyRoot, value: any) => {
    const newRoots = [...draftRoots]
    newRoots[idx] = { ...newRoots[idx], [field]: value }
    setDraftRoots(newRoots)
  }

  const deleteRoot = (idx: number) => {
    setDraftRoots(draftRoots.filter((_, i) => i !== idx))
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-card text-foreground font-sans">
      <div className="flex flex-col items-center p-6 md:p-12 min-h-full pb-32">
        <div className="w-full max-w-4xl space-y-8 pb-32">
          {/* HEADER */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3">
              <Inbox className="size-8 text-indigo-500" />
              Project Architect 7.0
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Интерактивный Архитектор. Найдет ваши проекты, спросит детали, и
              разложит всё по полочкам.
            </p>
          </div>

          {/* STEP 1: INPUT */}
          {step === 'input' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/50 p-6 rounded-3xl shadow-2xl space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Контекст (Кто вы и чем занимаетесь?)
                </label>
                <Textarea
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="Пример: Я делаю Fleeets (менеджер задач) и Randona (генератор маршрутов). Учусь играть на гитаре. Нужно разобрать бардак."
                  className="h-32 text-lg bg-muted/30 border-none resize-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>
              <Button
                size="lg"
                onClick={handleDiscover}
                disabled={isDiscovering || !hint.trim()}
                className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Ищу
                    проекты...
                  </>
                ) : (
                  <>
                    Найти Проекты <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* STEP 2: REVIEW (THE INTERVIEW) */}
          {step === 'review' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-orange-600 dark:text-orange-400 text-sm font-medium">
                ⚠️ <b>Проверьте определения!</b> ИИ мог ошибиться. Исправьте
                описания проектов, чтобы сортировка была точной.
              </div>

              <div className="space-y-4">
                {draftRoots.map((root, idx) => (
                  <div
                    key={idx}
                    className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm transition-all hover:border-primary/30"
                  >
                    {/* Header */}
                    <div
                      className="p-4 flex items-center gap-4 bg-muted/10 cursor-pointer"
                      onClick={() =>
                        setExpandedRoot(
                          expandedRoot === root.name ? null : root.name
                        )
                      }
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteRoot(idx)
                        }}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex-1">
                        <Input
                          value={root.name}
                          onChange={(e) =>
                            updateRoot(idx, 'name', e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="font-black text-xl bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-foreground"
                        />
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-xl">
                          {root.description}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 text-muted-foreground transition-transform',
                          expandedRoot === root.name && 'rotate-180'
                        )}
                      />
                    </div>

                    {/* Expanded Content */}
                    {expandedRoot === root.name && (
                      <div className="p-4 pt-0 space-y-4 bg-muted/5 border-t border-border/40 animate-in slide-in-from-top-2">
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">
                              Описание (Context)
                            </label>
                            <Textarea
                              value={root.description}
                              onChange={(e) =>
                                updateRoot(idx, 'description', e.target.value)
                              }
                              className="bg-background text-sm min-h-25"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">
                              Ключевые слова (Keywords)
                            </label>
                            <Textarea
                              value={root.keywords?.join(', ')}
                              onChange={(e) =>
                                updateRoot(
                                  idx,
                                  'keywords',
                                  e.target.value.split(',').map((s) => s.trim())
                                )
                              }
                              className="bg-background text-sm min-h-25"
                              placeholder="fleeets, my project, sharing reports (через запятую...)"
                            />
                          </div>
                        </div>

                        {/* Subs Preview */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            Подпроекты (Preview)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {root.subs?.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-1 bg-muted rounded text-xs font-medium border border-border/50"
                              >
                                {sub.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full border-dashed py-6 text-muted-foreground"
                  onClick={() =>
                    setDraftRoots([
                      ...draftRoots,
                      {
                        name: 'Новый Проект',
                        description: '',
                        keywords: [],
                        subs: [],
                      },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Добавить Проект
                </Button>
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-6 z-20">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1 bg-muted hover:bg-muted/80"
                  onClick={() => setStep('input')}
                >
                  Назад
                </Button>
                <Button
                  size="lg"
                  className="flex-3 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-xl"
                  onClick={handleSort}
                  disabled={isSorting}
                >
                  {isSorting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />{' '}
                      Сортирую...
                    </>
                  ) : (
                    <>
                      Начать Сортировку <Check className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && structure && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center bg-card p-4 rounded-xl border sticky top-4 z-20 shadow-sm">
                <div>
                  <h2 className="font-bold text-lg">Готово!</h2>
                  <p className="text-xs text-muted-foreground">
                    Разложено{' '}
                    {structure.reduce((a, b) => a + b.items.length, 0)} задач.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep('review')}>
                    Редактировать
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="font-bold"
                  >
                    {isApplying ? 'Сохраняю...' : 'Применить'}
                  </Button>
                </div>
              </div>

              {/* DOCUMENT VIEW */}
              <div className="space-y-12">
                {(() => {
                  const rootMap: Record<string, typeof structure> = {}
                  structure.forEach((g) => {
                    const root = g.group.split('/')[0]
                    if (!rootMap[root]) rootMap[root] = []
                    rootMap[root].push(g)
                  })

                  return Object.entries(rootMap).map(([root, groups]) => {
                    const rootDef = draftRoots.find((r) => r.name === root)
                    return (
                      <div key={root} className="relative group/root">
                        <div className="sticky top-20 bg-card/95 backdrop-blur z-10 py-4 border-b-2 border-primary/20 mb-6">
                          <h3 className="text-4xl font-black uppercase tracking-tighter">
                            {root}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 max-w-3xl line-clamp-2">
                            {rootDef?.description}
                          </p>
                        </div>

                        <div className="pl-6 border-l-2 border-border/30 ml-4 space-y-8">
                          {groups.map((g) => (
                            <div key={g.group}>
                              <h4 className="text-xl font-bold flex items-center gap-2">
                                {g.group.split('/')[1] || 'General'}
                                <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal text-muted-foreground">
                                  {g.items.length}
                                </span>
                              </h4>
                              <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {g.items.map((i) => (
                                  <li
                                    key={i.id}
                                    onClick={() => setFocusItem(i)}
                                    className="text-sm p-3 bg-muted/10 rounded-lg border border-border/40 flex gap-2 hover:bg-muted/20 transition-colors cursor-pointer active:scale-95 transform duration-100"
                                  >
                                    <span className="text-muted-foreground/30">
                                      •
                                    </span>
                                    {i.content}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
