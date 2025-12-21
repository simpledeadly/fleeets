'use client'
import { Card } from '@/components/ui/card'
import { Activity, Zap, CheckCircle2, Box } from 'lucide-react'

interface KPIGridProps {
  stats: {
    totalEvents: number
    focusMinutes: number
    triageCount: number
    createdCount: number
  }
}

export function KPIGrid({ stats }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Событий"
        value={stats.totalEvents}
        icon={<Activity size={16} />}
      />
      <StatCard
        title="Минут в фокусе"
        value={stats.focusMinutes}
        icon={<Zap size={16} />}
        highlight
      />
      <StatCard
        title="Разобрано"
        value={stats.triageCount}
        icon={<CheckCircle2 size={16} />}
      />
      <StatCard
        title="Создано задач"
        value={stats.createdCount}
        icon={<Box size={16} />}
      />
    </div>
  )
}

function StatCard({ title, value, highlight, icon }: any) {
  return (
    <Card
      className={`flex flex-col justify-center items-center p-6 transition-all ${
        highlight
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-border/50 bg-card/50'
      }`}
    >
      <div
        className={`mb-2 ${
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
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
        {title}
      </div>
    </Card>
  )
}
