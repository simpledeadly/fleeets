'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import {
  BioRhythmChart,
  KPIGrid,
  processStats,
  InterestsRadar,
  FunnelStack,
  ActivityFeed,
  VelocityLineChart,
  FocusAreaChart,
  AIAnalysisButton,
  TopItemsWidget,
  RawSamplesWidget,
} from '@/features/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StatsPage() {
  const [data, setData] = useState<ReturnType<typeof processStats> | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [weeklySummary, setWeeklySummary] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: rawLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte(
          'created_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order('created_at', { ascending: false })

      const { data: summary } = await supabase.rpc('get_weekly_summary', {
        user_uuid: user.id,
      })

      if (rawLogs) {
        setLogs(rawLogs)
        setData(processStats(rawLogs))
        setWeeklySummary(summary)
      }
    }
    load()
  }, [])

  if (!data)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    )

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Пульс активности</h1>
        <AIAnalysisButton />
      </div>

      {/* KPI */}
      <KPIGrid stats={data.kpi} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Теперь ты видишь ТОЧНО то же, что видел ИИ в своем JSON */}
        <TopItemsWidget items={weeklySummary?.top_items} />
        <RawSamplesWidget samples={weeklySummary?.recent_raw_samples} />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Биоритмы (Часы)" colSpan={2}>
          <BioRhythmChart data={data.activityByHour} />
        </ChartCard>

        <ChartCard title="Скорость потока">
          <VelocityLineChart data={data.dailyStats} />
        </ChartCard>

        <ChartCard title="Глубина фокуса">
          <FocusAreaChart data={data.dailyStats} />
        </ChartCard>

        <ChartCard title="ДНК Интересов">
          <InterestsRadar data={data.radarData} />
        </ChartCard>

        <ChartCard title="Судьба Входящих">
          <FunnelStack data={data.funnelData} />
        </ChartCard>
      </div>

      <ActivityFeed logs={logs.slice(0, 50)} />
    </div>
  )
}

function ChartCard({ title, children, colSpan = 1 }: any) {
  return (
    <Card
      className={`border-border/50 bg-card/50 ${
        colSpan === 2 ? 'md:col-span-2' : ''
      }`}
    >
      <CardHeader>
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
