import type { Item } from '@/lib/store'

export const OmniFooter = ({ item }: { item: Item | null }) => {
  if (!item) return <footer className="border-t border-border h-8" />

  return (
    <footer className="h-8 border-t border-border p-1.5 text-xs bg-card flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-150">
        <div className="flex items-center gap-1.5">
          {item.status !== 'done' && (
            <>
              {item.type === 'task' ? (
                <>
                  <Kbd keys={['⌘', 'D']} label="Done" />
                  <Kbd keys={['⌘', 'F']} label="Focus" />
                  <Kbd keys={['⌘', 'I']} label="Inbox" />
                </>
              ) : (
                item.status === 'archived' && (
                  <Kbd keys={['⌘', 'I']} label="Inbox" />
                )
              )}
            </>
          )}
          <Kbd keys={['⌘', 'Del']} label="Delete" />
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
