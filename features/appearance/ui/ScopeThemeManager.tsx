'use client'

import { useEffect } from 'react'
import { useScopeStore } from '@/features/scopes/model/store'

/**
 * Преобразует HEX в HSL-каналы для Tailwind.
 * Пример: #ffffff -> "0 0% 100%"
 * Важно: БЕЗ запятых и БЕЗ обертки hsl(), иначе сломается прозрачность.
 */
function hexToChannels(hex: string): string {
  // Убираем решетку
  hex = hex.replace(/^#/, '')

  // Парсим 3-значный hex
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  // Округляем до 1 знака после запятой для чистоты
  const hDeg = Math.round(h * 360)
  const sPct = (s * 100).toFixed(1) + '%'
  const lPct = (l * 100).toFixed(1) + '%'

  return `${hDeg} ${sPct} ${lPct}`
}

export function ScopeThemeManager() {
  const { activeScope } = useScopeStore()

  useEffect(() => {
    const styleId = 'scope-theme-dynamic'
    let styleTag = document.getElementById(styleId)

    // ЛОГИКА ПРЕДБАННИКА:
    // Если скоуп не выбран ИЛИ это General — удаляем кастомные стили.
    if (!activeScope || activeScope.slug === 'general') {
      if (styleTag) styleTag.remove()
      console.log('🎨 [Theme] Reset to Default (General)')
      return
    }

    // ДАЛЬШЕ ЛОГИКА ДЛЯ КОНКРЕТНЫХ ПРОЕКТОВ (как было)
    const theme = activeScope.theme_config || {}
    const lightVal = theme.card_light
      ? hexToChannels(theme.card_light)
      : '0 0% 100%'
    const darkVal = theme.card_dark
      ? hexToChannels(theme.card_dark)
      : '240 10% 3.9%'

    const css = `
      :root { --card: ${lightVal}; --popover: ${lightVal}; }
      .dark { --card: ${darkVal}; --popover: ${darkVal}; }
    `

    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = styleId
      document.head.appendChild(styleTag)
    }
    styleTag.innerHTML = css
    console.log(`🎨 [Theme] Applied Project Theme: ${activeScope.name}`)
  }, [activeScope])

  return null
}
