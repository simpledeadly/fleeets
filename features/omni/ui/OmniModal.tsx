'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useOmniStore } from '../model/store'
import { OmniBase } from './OmniBase'

export function OmniModal() {
  const { isPaletteOpen, closePalette } = useOmniStore()

  return (
    <Dialog open={isPaletteOpen} onOpenChange={closePalette}>
      <DialogContent
        showCloseButton={false}
        className="max-h-140 sm:max-w-4xl p-0 block overflow-hidden bg-card border-border/60 shadow-2xl transition-all duration-150"
      >
        <VisuallyHidden>
          <DialogTitle>Командный центр</DialogTitle>
        </VisuallyHidden>
        {/* Рендерим базу в режиме модалки */}
        <OmniBase mode="modal" />
      </DialogContent>
    </Dialog>
  )
}
