'use client'
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, COMMON_TOOLTIP_STYLE } from '../../config'

export function BioRhythmChart({ data }: { data: any[] }) {
  return (
    <div className="h-50 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={CHART_COLORS.primary}
                stopOpacity={1}
              />
              <stop
                offset="100%"
                stopColor={CHART_COLORS.primary}
                stopOpacity={0.3}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            tickFormatter={(val) => (val % 4 === 0 ? `${val}:00` : '')}
            stroke={CHART_COLORS.text}
            fontSize={9}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip {...COMMON_TOOLTIP_STYLE} />
          <Bar
            dataKey="count"
            radius={[4, 4, 4, 4]}
            fill="url(#barGradient)"
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
