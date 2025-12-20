'use client'
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { CHART_COLORS, COMMON_TOOLTIP_STYLE } from '../../config'

export function FocusAreaChart({ data }: { data: any[] }) {
  return (
    <div className="h-62.5 w-full text-[10px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={CHART_COLORS.primary}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS.primary}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke={CHART_COLORS.text}
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <Tooltip
            {...COMMON_TOOLTIP_STYLE}
            itemStyle={{ color: CHART_COLORS.primary }}
          />
          <Area
            type="monotone"
            dataKey="focusMinutes"
            name="Минут в потоке"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorFocus)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
