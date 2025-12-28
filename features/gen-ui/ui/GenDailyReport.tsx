'use client'

import { useRef, useState } from 'react'
import {
  CheckCircle2,
  PlusCircle,
  Clock,
  Target,
  TrendingUp,
  LucideIcon,
  Send,
  Loader2,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { sendPhotoToTelegram } from '@/features/notifications'
import { toast } from 'sonner'

// --- 1. Утилиты ---

const formatAge = (mins: number) => {
  if (mins < 1) return '< 1 мин'
  if (mins < 60) return `${mins} мин`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}ч ${m}м`
}

// --- 2. Подкомпоненты ---

// Блок крупной метрики (Фокус, Пропускная способность)
function StatBlock({
  label,
  value,
  subValue,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: string
  subValue: string
  icon: LucideIcon
  iconClass?: string
}) {
  return (
    <div className="p-4 rounded-2xl bg-secondary/10 border border-border/40 space-y-1">
      <div className="flex items-center gap-2 mb-1 opacity-70">
        <Icon className={cn('size-4', iconClass)} />
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">
        {value}
      </div>
      <div className="text-xs text-muted-foreground opacity-70 font-semibold">
        {subValue}
      </div>
    </div>
  )
}

// Обертка для секций (Закрытие долгов, Свежие мысли и т.д.)
function ReportSection({
  title,
  icon: Icon,
  iconClass,
  count,
  children,
}: {
  title: string
  icon: LucideIcon
  iconClass: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest',
          iconClass
        )}
      >
        <Icon size={16} />
        <span>
          {title} ({count})
        </span>
      </div>
      <div
        className={cn(
          'space-y-3 ml-1 pl-3 border-l-2',
          iconClass.replace('text-', 'border-').replace('500', '500/20')
        )}
      >
        {children}
      </div>
    </section>
  )
}

// --- 3. Главный компонент ---

export function GenDailyReport({ data }: { data: any }) {
  const reportRef = useRef<HTMLDivElement>(null) // 👈 Реф на весь отчет
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (!reportRef.current) return
    setIsSharing(true)
    console.log('📸 [UI] Начинаю скриншот...')

    try {
      // quality: 0.8 немного уменьшит вес файла
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#09090b', // Твой темный фон
        pixelRatio: 2, // Хорошее качество
      })

      console.log('🌐 [UI] Скриншот готов, отправляю на сервер...')

      const res = await sendPhotoToTelegram(
        dataUrl,
        `Отчёт за ${new Date(date).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`
      )

      if (res?.success) {
        toast.success('Отчет отправлен в Telegram!')
      } else {
        toast.error(res?.error || 'Ошибка сервера')
      }
    } catch (err: any) {
      console.error('❌ [UI] html-to-image error:', err)
      toast.error('Не удалось создать скриншот: ' + err.message)
    } finally {
      setIsSharing(false)
    }
  }

  const {
    input_count = 0,
    output_count = 0,
    created_today = [],
    old_triaged = [],
    completed = [],
    focus_stats = { total_mins: 0, sessions_count: 0, top_tag: null },
    date,
  } = data

  // Расчеты
  const throughputRatio =
    input_count > 0 ? output_count / input_count : output_count > 0 ? 1 : 0
  const percentage = Math.min(Math.round(throughputRatio * 100))
  const isOverDrive = output_count > input_count && input_count > 0

  const newTriaged = created_today?.filter((i: any) => i.is_triaged) || []
  const newStillInInbox = created_today?.filter((i: any) => !i.is_triaged) || []

  return (
    <div
      ref={reportRef}
      className="p-6 rounded-3xl bg-card border border-border/60 shadow-2xl space-y-8 font-sans animate-in fade-in zoom-in-95 duration-500"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Дневной итог
          </h3>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em]">
            {new Date(date).toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter">
          Fleeets Recap
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 gap-4">
        <StatBlock
          label="Время в потоке"
          value={`${focus_stats.total_mins}м`}
          subValue={`${focus_stats.sessions_count} сессий`}
          icon={Clock}
          iconClass="text-amber-500"
        />
        <StatBlock
          label="Пропускная способность"
          value={`${output_count}/${input_count} (${percentage}%)`}
          subValue={isOverDrive ? 'Backlog Buster' : 'Баланс потока'}
          icon={TrendingUp}
          iconClass={isOverDrive ? 'text-emerald-500' : 'text-primary'}
        />
      </div>

      {/* PROGRESS BAR SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between text-xs uppercase font-bold text-muted-foreground tracking-widest">
          <span>Входящая нагрузка</span>
          <span>
            {isOverDrive ? 'Backlog Buster' : `${percentage}% завершено`}
          </span>
        </div>
        <div className="h-1.5 w-full bg-secondary/80 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={cn(
              'h-full transition-colors duration-1000',
              isOverDrive
                ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-primary'
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed italic text-center px-4">
          {isOverDrive
            ? `Ты в ударе: обработал на ${
                output_count - input_count
              } задач больше, чем создал. Бэклог тает.`
            : output_count === input_count && input_count > 0
            ? 'Идеальный баланс. Ты выполнил всё, что запланировал.'
            : 'Входящий поток превышает выработку. Постарайся фокусироваться на завершении.'}
        </p>
      </div>

      {/* LIST SECTIONS */}
      <div className="space-y-6">
        {/* 1. Закрытие долгов */}
        {old_triaged?.length > 0 && (
          <ReportSection
            title="Закрытие долгов"
            icon={TrendingUp}
            iconClass="text-amber-500"
            count={old_triaged.length}
          >
            {old_triaged.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-start gap-4">
                <span className="text-sm font-medium text-foreground/80 leading-snug">
                  {item.content}
                </span>
                <span className="text-xs font-semibold text-amber-500/80 bg-amber-500/5 px-1.5 py-0.5 rounded whitespace-nowrap border border-amber-500/10">
                  Ждало {formatAge(item.age_mins)}
                </span>
              </div>
            ))}
          </ReportSection>
        )}

        {/* 2. Свежие мысли */}
        {(newTriaged.length > 0 || newStillInInbox.length > 0) && (
          <ReportSection
            title="Свежие мысли"
            icon={PlusCircle}
            iconClass="text-blue-500"
            count={created_today.length}
          >
            {newTriaged.map((item: any, i: number) => (
              <div
                key={i}
                className="text-sm font-medium text-foreground/80 leading-snug"
              >
                {item.content}
              </div>
            ))}
            {newStillInInbox.map((item: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center opacity-50"
              >
                <span className="text-sm font-medium italic">
                  {item.content}
                </span>
                <span className="text-xs font-semibold tracking-tighter bg-zinc-500/10 px-1 py-0.5 rounded border border-zinc-500/20">
                  Входящее
                </span>
              </div>
            ))}
          </ReportSection>
        )}

        {/* 3. Выполнено */}
        {completed?.length > 0 && (
          <ReportSection
            title="Выполнено"
            icon={CheckCircle2}
            iconClass="text-emerald-500"
            count={completed.length}
          >
            <div className="space-y-1.5 text-foreground/60 italic line-through decoration-muted-foreground/50">
              {completed.map((item: any, i: number) => (
                <div key={i} className="text-sm py-1">
                  {item.content}
                </div>
              ))}
            </div>
          </ReportSection>
        )}
      </div>

      {/* FOOTER: FOCUS TAG */}
      {focus_stats.top_tag && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
          <Target className="text-amber-500 w-4 h-4" />
          <span className="text-xs font-bold uppercase text-amber-500/80 tracking-widest">
            Фокус дня: #{focus_stats.top_tag}
          </span>
        </div>
      )}
      <button
        onClick={handleShare}
        disabled={isSharing}
        className="p-2 hover:bg-cyan-500/15 rounded-full transition-colors duration-150 flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/10 cursor-pointer"
      >
        {isSharing ? (
          <Loader2 size={16} className="text-cyan-300 animate-spin" />
        ) : (
          <Send size={16} className="text-cyan-300" />
        )}
      </button>
    </div>
  )
}
