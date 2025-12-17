"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function AdminDashboard({ totalCost, totalRequests, modelUsage, rawLogs, topUsers }: any) {

  // Подготовка данных для графика (расходы по дням)
  // (Упрощенная версия, группирует просто по порядку, в идеале надо по датам)
  const chartData = rawLogs.slice(-50).map((log: any, i: number) => ({
    name: i,
    cost: log.cost_usd
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Всего потрачено</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${totalCost.toFixed(5)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Всего запросов</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalRequests}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Самая дорогая модель</CardTitle></CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {Object.entries(modelUsage).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Юзеров в логах</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{topUsers.length}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. График (Занимает 2 колонки) */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Активность (Timeline)</CardTitle></CardHeader>
          <CardContent className="pl-2">
            <div className="h-100 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. ТОП ЮЗЕРОВ (Новый блок) */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Топ Транжир 💸</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topUsers.map((u: any, i: number) => (
                <div key={u.userId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{i + 1}.</span>
                    <span className="font-mono text-xs truncate w-24" title={u.userId}>
                      {u.userId.split('-')[0]}...
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-red-400">${u.cost.toFixed(5)}</span>
                    <span className="text-[10px] text-muted-foreground">{u.requests} req</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Логи текстом */}
      <div className="rounded-md border">
        <div className="p-4 bg-muted/50 font-mono text-xs overflow-auto max-h-100">
          {rawLogs.slice().reverse().map((log: any, i: number) => (
            <div key={i} className="flex justify-between py-1 border-b border-border/50 last:border-0">
              <span>[{new Date(log.created_at).toLocaleTimeString()}] {log.action} ({log.model})</span>
              <span className={log.cost_usd > 0.001 ? "text-red-400" : "text-green-400"}>
                ${log.cost_usd.toFixed(6)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}