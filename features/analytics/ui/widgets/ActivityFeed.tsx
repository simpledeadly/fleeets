'use client'
import { Badge } from '@/components/ui/badge'

export function ActivityFeed({ logs }: { logs: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
        Хронология (Last 50)
      </h3>
      <div className="space-y-2">
        {logs.slice(0, 50).map((log) => (
          <div
            key={log.id}
            className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/60 transition-colors"
          >
            <div className="flex items-center justify-between sm:justify-start gap-4 min-w-45">
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(log.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] h-5 font-mono opacity-70 group-hover:opacity-100 transition-opacity"
              >
                {log.category}
              </Badge>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {formatEventTitle(log)}
              </div>
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
      const duration = d.duration_seconds || 0
      return `Фокус: ${Math.floor(duration / 60)} мин`
    case 'item.update':
      return `Редактирование: ${
        d.fields ? Object.values(d.fields).join(', ') : 'детали'
      }`
    default:
      return log.category
  }
}
