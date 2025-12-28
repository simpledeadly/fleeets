'use client'

import { useRef, useState } from 'react'
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
  Send,
  Loader2,
  Zap,
  Target,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import { sendPhotoToTelegram } from '@/features/notifications/model/actions'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'

export function GenWeeklyReport({ data }: { data: any }) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isSharing, setIsSharing] = useState(false)

  const {
    range,
    daily_flow,
    focus_by_tags,
    total_focus_hours,
    total_completed,
  } = data

  console.log('📊 Weekly Flow Data:', data.daily_flow)

  const handleShare = async () => {
    if (!reportRef.current) return
    setIsSharing(true)
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#09090b',
        pixelRatio: 2,
      })
      const res = await sendPhotoToTelegram(
        dataUrl,
        `Недельный отчет:\n${range.start} — ${range.end}`
      )
      if (res?.success) toast.success('Отчет в Telegram!')
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
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em]">
            {new Date(range.start).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}{' '}
            —{' '}
            {new Date(range.end).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>

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

      <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-1 opacity-70 text-emerald-500">
          <CheckCircle2 size={16} />
          <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
            Завершено
          </span>
        </div>
        <div className="text-2xl font-bold tabular-nums text-emerald-500">
          {total_completed}
        </div>
      </div>

      {/* Velocity Chart */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <TrendingUp size={16} className="text-emerald-500" />
          <span>Скорость потока (Velocity)</span>
        </div>
        <div className="h-45 w-full pr-4">
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
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  borderRadius: '12px',
                }}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                  })
                }
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />

              {/* Линия Вход */}
              <Line
                type="monotone"
                dataKey="input"
                name="Вход"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                animationDuration={1000}
              />

              {/* Линия Выход */}
              <Line
                type="monotone"
                dataKey="output"
                name="Результат"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40">
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

        <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40 overflow-hidden">
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

      <p className="text-xs text-muted-foreground leading-relaxed italic text-center px-4 opacity-70 font-medium">
        Система проанализировала твой путь. Двигайся дальше.
      </p>
    </div>
  )
}
