// features/analytics/config.ts

// 1. ЦВЕТОВАЯ ПАЛИТРА
export const CHART_COLORS = {
  primary: '#f59e0b', // Amber (Фокус)
  secondary: '#3b82f6', // Blue (План)
  success: '#10b981', // Green (Готово)
  danger: '#ef4444', // Red (Удалено/Входящие)
  info: '#8b5cf6', // Purple (Архив)
  muted: '#525252', // Grey
  grid: 'rgba(255,255,255,0.05)',
  text: '#888888',
}

// 2. ЕДИНЫЙ СТИЛЬ ТУЛТИПОВ (Glassmorphism)
export const COMMON_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgba(9, 9, 11, 0.9)', // zinc-950 + opacity
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    padding: '8px 12px',
  },
  itemStyle: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
    padding: 0,
  },
  labelStyle: {
    color: '#a1a1aa', // zinc-400
    fontSize: '10px',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  cursor: {
    fill: 'rgba(255,255,255,0.05)',
    strokeWidth: 0,
  },
}
