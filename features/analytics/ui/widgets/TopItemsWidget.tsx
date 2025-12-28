import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TopItemsWidget({ items }: { items: any[] }) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Эпицентры внимания (Top 5)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items?.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="truncate flex-1 pr-4">{item.content}</span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {item.action_count} действий
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
