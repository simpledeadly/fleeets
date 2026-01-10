'use client'

import { useState, useEffect } from 'react'
import { getBlueprintHistory } from '../model/actions'
import { Check, ChevronDown, GitBranch } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BlueprintHistoryProps {
  scopeId: string
  activeBlueprintName?: string | null
  onSelect: (bp: any) => void
}

export function BlueprintHistory({
  scopeId,
  activeBlueprintName,
  onSelect,
}: BlueprintHistoryProps) {
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    getBlueprintHistory(scopeId).then(setHistory)
  }, [scopeId])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-muted/50 border border-border rounded-lg text-xs font-medium transition-all outline-none group cursor-pointer">
        <GitBranch
          size={14}
          className="text-muted-foreground group-hover:text-primary"
        />
        <span className="max-w-40 truncate text-foreground">
          {activeBlueprintName || 'Выбрать версию'}
        </span>
        <ChevronDown size={12} className="text-muted-foreground opacity-50" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 max-h-96 overflow-y-auto custom-scrollbar"
      >
        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">
          История стратегий
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {history.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground italic">
            История пуста
          </div>
        )}

        {history.map((bp) => (
          <DropdownMenuItem
            key={bp.id}
            onClick={() => onSelect(bp)}
            className="flex flex-col items-start gap-1 py-2.5 cursor-pointer focus:bg-muted/50"
          >
            <div className="flex items-center justify-between w-full">
              <span
                className={`font-bold truncate ${
                  bp.is_active ? 'text-primary' : ''
                }`}
              >
                {bp.name}
              </span>
              {bp.is_active && <Check size={14} className="text-green-500" />}
            </div>
            {bp.description && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 w-full">
                {bp.description}
              </p>
            )}
            <div className="flex items-center justify-between w-full mt-1">
              <span className="text-[9px] text-muted-foreground/60 font-mono">
                {new Date(bp.created_at).toLocaleDateString()}
              </span>
              {!bp.is_active && (
                <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-white/40">
                  Просмотр
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
