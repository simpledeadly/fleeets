// features/scopes/ui/MoveToScopeButton.tsx
'use client'

import { useState } from 'react'
import { useScopeStore } from '@/features/scopes'
import { moveItemsToScope } from '@/features/item'
import { toast } from 'sonner'
import { FolderInput } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MoveToScopeButtonProps {
  selectedIds: string[]
  onComplete?: () => void
}

export function MoveToScopeButton({
  selectedIds,
  onComplete,
}: MoveToScopeButtonProps) {
  const { scopes } = useScopeStore()
  const [isMoving, setIsMoving] = useState(false)

  if (selectedIds.length === 0) return null

  const handleMove = async (scopeId: string, scopeName: string) => {
    setIsMoving(true)
    const toastId = toast.loading(
      `Перемещаю ${selectedIds.length} задач в ${scopeName}...`
    )

    try {
      await moveItemsToScope(selectedIds, scopeId)
      toast.success('Готово', { id: toastId })
      onComplete?.()
    } catch (e) {
      toast.error(`Ошибка перемещения: ${e}`, { id: toastId })
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isMoving}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted-foreground/20 rounded-md text-xs font-medium transition-colors outline-none cursor-pointer"
      >
        <FolderInput size={16} />
        <span>В проект...</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-56 max-h-80 overflow-y-auto"
      >
        <DropdownMenuLabel>Выберите проект</DropdownMenuLabel>
        {scopes.map((scope) => (
          <DropdownMenuItem
            key={scope.id}
            onClick={() => handleMove(scope.id, scope.name)}
            className="cursor-pointer"
          >
            {scope.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
