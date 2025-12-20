'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
} from 'recharts'
import { toast } from 'sonner'
import {
  Loader2,
  Zap,
  CheckCircle2,
  Box,
  Activity,
  BrainCircuit,
} from 'lucide-react'
import { askBrain } from '@/features/ai'
import { FunnelStack } from './FunnelStack'

export default function StatsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Берем больше логов для точности (500)
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte(
          'created_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order('created_at', { ascending: false })

      setLogs(data || [])
      setLoading(false)
    }
    fetchStats()
  }, [])

  // 1. RADAR CHART (Теги и Фокус)
  const tagStats: Record<string, number> = {}
  logs.forEach((log) => {
    if (log.category === 'focus.session' && log.details?.tags) {
      const duration = log.details.duration_seconds || 0
      log.details.tags.forEach((tag: string) => {
        tagStats[tag] = (tagStats[tag] || 0) + duration
      })
    }
  })
  // Топ-6 тегов для графика
  const radarData = Object.entries(tagStats)
    .map(([tag, seconds]) => ({ subject: tag, A: Math.round(seconds / 60) }))
    .sort((a, b) => b.A - a.A)
    .slice(0, 6)

  // 2. FUNNEL / PIE (Судьба входящих)
  // Куда уходят задачи из инбокса?
  const triageStats = { planned: 0, today: 0, deleted: 0, archived: 0 }
  logs.forEach((log) => {
    if (log.category === 'item.triage' || log.category === 'inbox_triage') {
      const dest = log.details.destination
      if (dest === 'planned') triageStats.planned++
      if (dest === 'today') triageStats.today++
      if (dest === 'deleted') triageStats.deleted++
      if (dest === 'archived') triageStats.archived++
    }
  })

  const funnelData = [
    { name: 'В план', value: triageStats.planned, color: '#3b82f6' }, // Blue
    { name: 'В фокус', value: triageStats.today, color: '#f59e0b' }, // Amber
    { name: 'В архив', value: triageStats.archived, color: '#8b5cf6' }, // Purple
    { name: 'Удалено', value: triageStats.deleted, color: '#ef4444' }, // Red
  ].filter((i) => i.value > 0)

  // --- ИИ АНАЛИТИК ---
  const handleAnalyze = async () => {
    setIsAnalyzing(true)

    // 🔥 АГРЕГАЦИЯ ДАННЫХ (Сжимаем 1000 логов в маленький JSON)
    const summary = {
      period: 'Last 7 days',
      total_focus_minutes: Math.round(
        logs
          .filter((l) => l.category === 'focus.session')
          .reduce((acc, c) => acc + (c.details.duration_seconds || 0), 0) / 60
      ),
      top_tags: radarData,
      inbox_triage: triageStats,
      created_count: logs.filter((l) => l.category === 'item.create').length,
    }

    const prompt = `
      Проанализируй мою статистику продуктивности за неделю (JSON).
      Будь краток, но проницателен.
      1. Найди перекосы (на что я трачу время vs что я планирую).
      2. Оцени мою решительность (много ли я удаляю или все тащу в план).
      3. Дай один жесткий совет.
      
      ДАННЫЕ: ${JSON.stringify(summary)}
    `

    // Используем askBrain как транспорт (он умеет ходить в Llama)
    const result = await askBrain(prompt)

    if (result.answer) {
      toast('Вердикт ИИ', {
        description: result.answer,
        duration: 10000, // Читать долго
      })
    } else {
      toast.error('ИИ задумался и промолчал')
    }

    setIsAnalyzing(false)
  }

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    )

  // --- АНАЛИТИКА ---

  // 1. График Активности (Количество действий по часам)
  const activityByHour = Array(24)
    .fill(0)
    .map((_, i) => ({ hour: i, count: 0 }))
  logs.forEach((log) => {
    const hour = new Date(log.created_at).getHours()
    activityByHour[hour].count += 1
  })

  // 2. KPI (Исправленный подсчет)
  // Считаем все события разбора (triage)
  const triageCount = logs.filter(
    (l) => l.category === 'item.triage' || l.category === 'inbox_triage'
  ).length

  // Считаем созданные задачи
  const createdCount = logs.filter((l) => l.category === 'item.create').length

  // Считаем минуты фокуса (Суммируем duration_seconds или разницу дат)
  const focusSeconds = logs
    .filter((l) => l.category === 'focus.session' || l.category === 'deep_work')
    .reduce((acc, curr) => {
      const details = curr.details || {}
      // Приоритет: записанные секунды -> вычисленные секунды -> 0
      const duration =
        details.duration_seconds ||
        (new Date(curr.ended_at).getTime() -
          new Date(curr.started_at).getTime()) /
          1000
      return acc + (duration > 0 ? duration : 0)
    }, 0)

  const focusMinutes = Math.round(focusSeconds / 60)

  // --- 4. ПОДГОТОВКА ДАННЫХ ПО ДНЯМ (Last 7 Days) ---
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }) // "Пн, 20"
  })

  const dailyStats = last7Days.map((dayLabel) => {
    return {
      name: dayLabel,
      created: 0,
      completed: 0,
      focusMinutes: 0,
    }
  })

  logs.forEach((log) => {
    const logDate = new Date(log.created_at).toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
    })
    const dayStat = dailyStats.find((d) => d.name === logDate)

    if (dayStat) {
      // Подсчет созданных
      if (log.category === 'item.create') dayStat.created++

      // Подсчет завершенных (done или archived из triage)
      if (
        log.category === 'item.status_change' &&
        (log.details.to === 'done' || log.details.to === 'archived')
      ) {
        dayStat.completed++
      }
      // Или если сразу из инбокса в архив/удалено (triage)
      if (
        (log.category === 'item.triage' || log.category === 'inbox_triage') &&
        (log.details.destination === 'archived' ||
          log.details.destination === 'deleted')
      ) {
        dayStat.completed++
      }

      // Подсчет фокуса
      if (log.category === 'focus.session' || log.category === 'deep_work') {
        const duration = log.details.duration_seconds || 0
        dayStat.focusMinutes += Math.round(duration / 60)
      }
    }
  })

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in">
      <div className="flex items-center gap-3 mb-8 justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-primary h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">
            Пульс активности
          </h1>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors border border-zinc-800 cursor-pointer"
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="h-4 w-4 text-amber-500" />
          )}
          {isAnalyzing ? 'Анализирую...' : 'AI-Разбор'}
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Событий"
          value={logs.length}
          icon={<Activity size={16} />}
        />
        <StatCard
          title="Минут в фокусе"
          value={focusMinutes}
          icon={<Zap size={16} />}
          highlight
        />
        <StatCard
          title="Разобрано"
          value={triageCount}
          icon={<CheckCircle2 size={16} />}
        />
        <StatCard
          title="Создано задач"
          value={createdCount}
          icon={<Box size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. БИОРИТМЫ (BAR) */}
        <Card className="border-border/50 bg-card/50 col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Биоритмы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-50 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityByHour}>
                  <defs>
                    <linearGradient
                      id="barGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop
                        offset="100%"
                        stopColor="#f59e0b"
                        stopOpacity={0.3}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(val) => (val % 4 === 0 ? `${val}:00` : '')}
                    stroke="#333"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 4, 4]}
                    fill="url(#barGradient)"
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. ДНК ИНТЕРЕСОВ (RADAR) */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              ДНК Интересов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-62.5 w-full text-[10px]">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    data={radarData}
                  >
                    <defs>
                      <linearGradient
                        id="radarFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f59e0b"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f59e0b"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <PolarGrid
                      gridType="circle"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#666', fontSize: 10, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 'auto']}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="Минут"
                      dataKey="A"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#radarFill)"
                      fillOpacity={0.6}
                      isAnimationActive={true}
                      animationDuration={1500}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111',
                        border: '1px solid #333',
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Нет данных о фокусе с тегами
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. СУДЬБА ВХОДЯЩИХ (FUNNEL STACK) */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Судьба Входящих
            </CardTitle>
          </CardHeader>
          <CardContent className="h-62.5 flex items-center justify-center">
            {funnelData.length > 0 ? (
              <FunnelStack data={funnelData} />
            ) : (
              <div className="text-muted-foreground text-xs">
                Разбери инбокс, чтобы увидеть статистику
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. ВЕЛОСИТИ (Created vs Done) */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Скорость Потока (Velocity)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-62.5 w-full text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.1}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#555"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  {/* Линия Созданных (Красная/Оранжевая - Нагрузка) */}
                  <Line
                    type="monotone"
                    dataKey="created"
                    name="Входящие"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#111', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                  {/* Линия Сделанных (Зеленая/Синяя - Результат) */}
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Закрытые"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#111', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 5. ЛАНДШАФТ ФОКУСА (Area) */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Глубина Фокуса (мин/день)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-62.5 w-full text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.1}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#555"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#f59e0b', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="focusMinutes"
                    name="Минут в потоке"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFocus)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ГРАФИК: БИОРИТМЫ */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Биоритмы (Действия по часам)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-62.5 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityByHour}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  tickFormatter={(val) => (val % 4 === 0 ? `${val}:00` : '')} // Реже подписи
                  stroke="#333"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#666' }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 4, 4]}
                  fill="url(#barGradient)"
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ЛЕНТА СОБЫТИЙ */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
          Хронология (Последние 50)
        </h3>
        <div className="space-y-2">
          {logs.slice(0, 50).map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 p-4 rounded-xl border bg-card/50"
            >
              {/* Время и Категория */}
              <div className="text-xs text-muted-foreground font-mono min-w-13 flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {new Date(log.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <Badge variant="outline" className="text-xs h-5">
                  {log.category}
                </Badge>
              </div>

              {/* Описание */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {formatEventTitle(log)}
                </div>
                {/* Детали (контент задачи) */}
                {log.details?.item_content && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 opacity-60">
                    {log.details.item_content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, highlight, icon }: any) {
  return (
    <Card
      className={`flex flex-col justify-center items-center p-6 transition-all ${
        highlight ? 'border-amber-500/30 bg-amber-500/5' : 'bg-card/50'
      }`}
    >
      <div
        className={`mb-0 ${
          highlight ? 'text-amber-500' : 'text-muted-foreground'
        }`}
      >
        {icon}
      </div>
      <div
        className={`text-3xl font-bold ${
          highlight ? 'text-amber-500' : 'text-foreground'
        }`}
      >
        {value}
      </div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0">
        {title}
      </div>
    </Card>
  )
}

function formatEventTitle(log: any) {
  const d = log.details || {}

  switch (log.category) {
    case 'item.create':
      return `Создана задача (${d.source || 'web'})`

    case 'item.status_change':
      return `Статус: ${d.from} ➔ ${d.to}`

    case 'item.triage':
      return `Разобрано ➔ ${d.destination}`

    case 'focus.session':
      // Безопасное вычисление длительности
      const duration =
        d.duration_seconds ||
        Math.max(
          0,
          Math.round(
            (new Date(log.ended_at).getTime() -
              new Date(log.started_at).getTime()) /
              1000
          )
        )

      const tags = d.tags && d.tags.length > 0 ? ` [${d.tags.join(', ')}]` : ''
      return `Фокус: ${formatDuration(duration)}${tags}`

    case 'item.update':
      const fields = d.fields || d.fields_changed || []
      return `Редактирование: ${
        Array.isArray(fields) ? fields.join(', ') : 'детали'
      }`

    default:
      return log.category
  }
}

function formatDuration(seconds: number) {
  if (!seconds && seconds !== 0) return 'неизвестно'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m} мин ${s} сек`
  return `${s} сек`
}
