'use client'

import { OmniBase } from '@/features/omni'

export const VaultSpace = () => {
  return (
    <div className="bg-card animate-in fade-in duration-100">
      {/* Рендерим базу в полноэкранном режиме */}
      <OmniBase mode="standalone" />
    </div>
  )
}
