import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RawSamplesWidget({ samples }: { samples: any[] }) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Последние улики (Raw Samples)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs font-mono space-y-1 opacity-70">
          {samples?.map((s, i) => (
            <div key={i} className="truncate">
              <span className="text-amber-500">
                {new Date(s.created_at).toLocaleTimeString()}:
              </span>{' '}
              {s.category} ➔ {s.details?.item_content || s.details?.destination}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
