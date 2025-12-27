'use client'
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { CHART_COLORS, COMMON_TOOLTIP_STYLE } from '../../config'

export function VelocityLineChart({ data }: { data: any[] }) {
  return (
    <div className="h-62.5 w-full text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
          <Tooltip {...COMMON_TOOLTIP_STYLE} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px' }}
          />

          <Line
            type="monotone"
            dataKey="created"
            name="Входящие"
            stroke={CHART_COLORS.danger}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            name="Закрытые"
            stroke={CHART_COLORS.success}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
