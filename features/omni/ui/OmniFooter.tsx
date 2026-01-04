import type { Item } from '@/lib/store'

export const OmniFooter = ({ item }: { item: Item | null }) => {
  if (!item) return <footer className="border-t border-border h-8" />

  return (
    <footer className="h-8 border-t border-border p-1.5 text-xs bg-card flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-100">
        <div className="flex items-center gap-2">
          {item.status !== 'done' && (
            <>
              {item.type === 'task' ? (
                <>
                  <div className="flex items-center gap-1">
                    <Kbd keys={['⌘', 'D']} /> <span>Готово</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Kbd keys={['⌘', 'F']} /> <span>Фокус</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Kbd keys={['⌘', 'I']} /> <span>Входящие</span>
                  </div>
                </>
              ) : (
                item.status === 'archived' && (
                  <div className="flex items-center gap-1">
                    <Kbd keys={['⌘', 'I']} /> <span>Восстановить</span>
                  </div>
                )
              )}
            </>
          )}
          <div className="flex items-center gap-1">
            <Kbd keys={['⌘', 'Del']} /> <span>Удалить</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function Kbd({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5 bg-card border border-border px-1.5 py-0.5 rounded shadow-xs min-w-5 justify-center">
      {keys.map((k, i) => (
        <span key={i} className={k === '⌘' ? 'font-sans' : ''}>
          {k}
        </span>
      ))}
    </div>
  )
}
