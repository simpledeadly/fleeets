'use client'

import { useLayoutEffect } from 'react'
import { useScopeStore } from '@/features/scopes'
import { useTheme } from 'next-themes'

/**
 * ScopeThemeManager
 *
 * Handles dynamic CSS variable updates when switching scopes or themes.
 * Works in tandem with RootLayout server-side injection to ensure zero-flash loading.
 */
export function ScopeThemeManager() {
  const { activeScope, isLoading } = useScopeStore()
  const { theme, resolvedTheme } = useTheme()

  useLayoutEffect(() => {
    // 1. REMOVE SERVER-SIDE INJECTED STYLE TAG
    // Once hydration is complete and we know our active scope, we remove the static
    // server-side style to avoid any conflicts with our dynamic client-side overrides.
    const injectedStyle = document.getElementById('fleeets-theme-injection')
    if (injectedStyle) {
      injectedStyle.remove()
    }

    const root = document.documentElement

    const updateTheme = () => {
      // 2. FONT FALLBACKS
      root.style.setProperty(
        '--font-geist-sans',
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
      )
      root.style.setProperty(
        '--font-geist-mono',
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
      )

      const isProject = activeScope && activeScope.slug !== 'general'
      const accent = activeScope?.theme_config?.accent || '#3b82f6'

      // 3. IF GENERAL SCOPE: RESET TO DEFAULTS
      // We must explicitly reset these to match globals.css to ensure clean transitions.
      if (!isProject) {
        const isDark = resolvedTheme === 'dark'

        // Identity
        root.style.removeProperty('--scope-accent')
        root.style.removeProperty('--scope-primary')
        root.style.setProperty(
          '--primary',
          isDark ? 'oklch(0.92 0.004 286.32)' : 'oklch(0.21 0.006 285.885)'
        )
        root.style.setProperty(
          '--ring',
          isDark ? 'oklch(0.705 0.015 286.067)' : 'oklch(0.705 0.015 286.067)'
        )

        // Surface Colors (Mapping from globals.css)
        root.style.setProperty(
          '--background',
          isDark ? 'oklch(0.141 0.005 285.823)' : 'oklch(1 0 0)'
        )
        root.style.setProperty(
          '--card',
          isDark ? 'oklch(0.21 0.006 285.885)' : 'oklch(1 0 0)'
        )
        root.style.setProperty(
          '--popover',
          isDark ? 'oklch(0.21 0.006 285.885)' : 'oklch(1 0 0)'
        )
        root.style.setProperty(
          '--sidebar',
          isDark ? 'oklch(0.141 0.005 285.823)' : 'oklch(0.985 0 0)'
        )

        root.style.setProperty(
          '--border',
          isDark ? 'oklch(1 0 0 / 10%)' : 'oklch(0.92 0.004 286.32)'
        )
        root.style.setProperty(
          '--muted',
          isDark ? 'oklch(0.274 0.006 286.033)' : 'oklch(0.967 0.001 286.375)'
        )
        root.style.setProperty(
          '--accent',
          isDark ? 'oklch(0.274 0.006 286.033)' : 'oklch(0.967 0.001 286.375)'
        )
        root.style.setProperty(
          '--sidebar-border',
          isDark ? 'oklch(1 0 0 / 10%)' : 'oklch(0.92 0.004 286.32)'
        )

        root.style.setProperty(
          '--foreground',
          isDark ? 'oklch(0.985 0 0)' : 'oklch(0.141 0.005 285.823)'
        )
        root.style.setProperty(
          '--muted-foreground',
          isDark ? 'oklch(0.705 0.015 286.067)' : 'oklch(0.552 0.016 285.938)'
        )
        return
      }

      // 4. PROJECT THEME: APPLY OVERRIDES
      const isDark = resolvedTheme === 'dark'

      root.style.setProperty('--scope-accent', accent)
      root.style.setProperty('--scope-primary', accent)
      root.style.setProperty('--primary', accent)
      root.style.setProperty('--ring', accent)

      const bgBase = isDark ? 'oklch(0.16 0.005 285.8)' : 'oklch(1 0 0)'
      const bgMix = isProject ? (isDark ? '6%' : '14%') : '14%'
      const borderMix = isProject ? (isDark ? '20%' : '60%') : '60%'

      const bgVal = `color-mix(in srgb, ${accent} ${bgMix}, ${bgBase})`
      const borderVal = `color-mix(in srgb, ${accent} ${borderMix}, ${bgBase})`

      root.style.setProperty('--background', bgVal)
      root.style.setProperty('--card', bgVal)
      root.style.setProperty('--popover', bgVal)
      root.style.setProperty('--sidebar', bgVal)

      root.style.setProperty('--border', borderVal)
      root.style.setProperty('--muted', borderVal)
      root.style.setProperty('--accent', borderVal)
      root.style.setProperty('--sidebar-border', borderVal)

      if (isDark) {
        root.style.setProperty('--foreground', 'oklch(0.94 0 0)')
        root.style.setProperty('--muted-foreground', 'oklch(0.78 0.01 285.8)')
      } else {
        root.style.setProperty('--foreground', 'oklch(0.16 0.005 285.8)')
        root.style.setProperty('--muted-foreground', 'oklch(0.42 0.01 285.938)')
      }
    }

    updateTheme()
  }, [activeScope, isLoading, theme, resolvedTheme])

  return null
}
