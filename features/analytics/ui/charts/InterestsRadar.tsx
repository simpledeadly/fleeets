'use client'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, COMMON_TOOLTIP_STYLE } from '../../config'

export function InterestsRadar({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-62.5 flex items-center justify-center text-muted-foreground text-xs">
        Нет данных о тегах
      </div>
    )
  }

  return (
    <div className="h-62.5 w-full text-[10px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={CHART_COLORS.primary}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS.primary}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <PolarGrid gridType="circle" stroke={CHART_COLORS.grid} />
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
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#radarFill)"
            fillOpacity={0.6}
            isAnimationActive={true}
            animationDuration={1500}
          />
          <Tooltip {...COMMON_TOOLTIP_STYLE} separator=": " />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
