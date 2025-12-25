'use client'

import Snowfall from 'react-snowfall'
import { useStore } from '@/lib/store'
import { useTheme } from 'next-themes'

export function SnowLayer() {
  const isSnowing = useStore((state) => state.isSnowing)
  const { theme } = useTheme()

  if (!isSnowing) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-60">
      <Snowfall
        // Цвет снежинок: Белый в темной теме, Светло-голубой в светлой
        color={theme === 'dark' ? '#dee4fd' : '#ff5722'}
        // Количество (не делай много, чтобы не отвлекало)
        snowflakeCount={100}
        // Размеры снежинок
        radius={[0.5, 2.0]}
        // Скорость
        speed={[0.5, 2.0]}
        // Ветер (легкий дрейф)
        wind={[-0.5, 1.0]}
      />
    </div>
  )
}
