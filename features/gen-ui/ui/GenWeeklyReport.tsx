'use client'

import { useRef, useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  YAxis,
} from 'recharts'
import {
  Zap,
  Target,
  TrendingUp,
  CheckCircle2,
  Layers,
  PlusCircle,
} from 'lucide-react'
import { sendPhotoToTelegram } from '@/features/notifications'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function GenWeeklyReport({ data }: { data: any }) {
  const reportRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSharing, setIsSharing] = useState(false)

  const {
    range,
    daily_flow = [],
    focus_by_tags,
    total_focus_hours,
    total_completed,
  } = data

  // --- МАТЕМАТИКА ПЕРИОДА ---
  const totalStats = useMemo(() => {
    return daily_flow.reduce(
      (acc: any, curr: any) => ({
        input: acc.input + (curr.input || 0),
        output: acc.output + (curr.output || 0),
      }),
      { input: 0, output: 0 }
    )
  }, [daily_flow])

  const handleShare = async () => {
    if (!reportRef.current) return
    setIsSharing(true)
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#09090b',
        pixelRatio: 2,
      })
      await sendPhotoToTelegram(
        dataUrl,
        `Недельный отчет:\n${new Date(range.start).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
        })} — ${new Date(range.end).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      )
      toast.success('Отчет в Telegram!')
    } catch {
      toast.error('Ошибка скриншота')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div
      ref={reportRef}
      className="p-6 rounded-3xl bg-card border border-border/60 shadow-2xl space-y-8 font-sans animate-in fade-in zoom-in-95 duration-500"
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Недельный дайджест
          </h3>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            {new Date(range.start).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
            {' — '}
            {new Date(range.end).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>
        <div
          onClick={handleShare}
          className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter cursor-pointer"
        >
          Fleeets Recap
        </div>
      </div>

      {/* --- ГЛАВНЫЕ KPI (3 колонки) --- */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Элементов создано"
          value={totalStats.input}
          icon={PlusCircle}
          colorClass="text-blue-500"
          bgClass="bg-blue-500/5 border-blue-500/20"
        />
        <SummaryCard
          label="Добавлено в Память"
          value={totalStats.output}
          icon={Layers}
          colorClass="text-green-500"
          bgClass="bg-green-500/5 border-green-500/20"
        />
        <SummaryCard
          label="Выполнено"
          value={total_completed}
          icon={CheckCircle2}
          colorClass="text-emerald-400"
          bgClass="bg-emerald-400/5 border-emerald-400/20"
        />
      </div>

      {/* Velocity Chart */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <TrendingUp size={16} className="text-emerald-500" />
          <span>Скорость потока</span>
        </div>
        <div className="h-48 w-full pr-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily_flow}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(str) =>
                  new Date(str).toLocaleDateString('ru-RU', { day: 'numeric' })
                }
                stroke="#444"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  borderRadius: '12px',
                }}
                labelFormatter={(l) =>
                  new Date(l).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                  })
                }
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 'bold',
                }}
              />

              <Line
                type="monotone"
                dataKey="input"
                name="Вход"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                animationDuration={1200}
              />
              <Line
                type="monotone"
                dataKey="output"
                name="Результат"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Focus & Tags Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-secondary/10 border border-border/40">
          <div className="flex items-center gap-2 mb-1 opacity-70 text-amber-500">
            <Zap size={16} fill="currentColor" />
            <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Глубокий фокус
            </span>
          </div>
          <div className="text-2xl font-black tabular-nums">
            {total_focus_hours}ч
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/10 border border-border/40 overflow-hidden">
          <div className="flex items-center gap-2 mb-2 opacity-70 text-blue-500">
            <Target size={16} />
            <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Главные теги
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.keys(focus_by_tags || {}).length > 0 ? (
              Object.keys(focus_by_tags)
                .slice(0, 3)
                .map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 truncate max-w-full"
                  >
                    #{tag}
                  </span>
                ))
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Нет тегов
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed italic text-center px-4 opacity-50 font-medium">
        Система проанализировала твой путь. Ты в игре.
      </p>
    </div>
  )
}

// Мини-компонент для верхних карточек
function SummaryCard({ label, value, icon: Icon, colorClass, bgClass }: any) {
  return (
    <div
      className={cn(
        'p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all',
        bgClass
      )}
    >
      <Icon size={20} className={colorClass} />
      <div className={cn('text-xl font-black tabular-nums', colorClass)}>
        {value}
      </div>
      <span className="text-xs uppercase font-bold tracking-tighter text-primary/40">
        {label}
      </span>
    </div>
  )
}
