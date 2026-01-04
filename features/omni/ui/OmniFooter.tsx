import type { Item } from '@/lib/store'

export const OmniFooter = ({ item }: { item: Item | null }) => {
  if (!item) return <footer className="border-t border-border hidden" />

  return (
    <footer className="h-8 border-t border-border p-1.5 text-xs bg-card flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-150 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5">
          {item.status !== 'done' && (
            <>
              {item.type === 'task' ? (
                <>
                  <Kbd keys={['⌘', 'D']} label="Выполнить" />
                  <Kbd keys={['⌘', 'F']} label="Фокус" />
                  <Kbd keys={['⌘', 'I']} label="Входящее" />
                </>
              ) : (
                item.status === 'archived' && (
                  <Kbd keys={['⌘', 'I']} label="Вернуть" />
                )
              )}
            </>
          )}
          <Kbd keys={['⌘', 'Del']} label="Удалить" />
          <Kbd keys={['⌘', 'E']} label="Редактировать" />
          <Kbd keys={['⌘', 'X']} label="Выделить" />
          <Kbd keys={['Enter']} label="Открыть" />
        </div>
      </div>
    </footer>
  )
}

function Kbd({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1 bg-card border border-border/90 px-1 py-0.5 rounded shadow-0">
      <span className="font-sans text-foreground/80">{keys.join('')}</span>
      <span className="text-muted-foreground font-mono">{label}</span>
    </div>
  )
}
