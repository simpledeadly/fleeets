// app/layout.tsx
import { cookies } from 'next/headers'
import './globals.css'
import type { Viewport } from 'next'
import { Toaster } from 'sonner'
import StoreInitializer from './components/StoreInitializer'
import { PaywallModal } from '@/features/paywall'
import { ThemeProvider } from './components/ThemeProvider'
import { LayoutClient } from './components/LayoutClient'
import { Sidebar } from '@/features/navigation'
import { createClient } from '../lib/supabase/server'
import { ScopeThemeManager } from '@/features/appearance/ScopeThemeManager'

import { getScopes } from '@/features/scopes'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Запрещает зум при клике в инпуты
  userScalable: false, // Запрещает щипок (pinch-to-zoom)
  viewportFit: 'cover', // Позволяет контенту заходить под челку
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { scopes, activeScopeId } = await getScopes()
  const activeScope = scopes.find((s) => s.id === activeScopeId)

  let injectedStyle = null

  if (activeScope && activeScope.slug !== 'general') {
    try {
      const accent = activeScope.theme_config?.accent || '#3b82f6'
      const darkBase = 'oklch(0.16 0.005 285.8)'
      const lightBase = 'oklch(1 0 0)'

      const generateVars = (isDark: boolean) => {
        const base = isDark ? darkBase : lightBase
        const bgMix = isDark ? '6%' : '14%'
        const borderMix = isDark ? '15%' : '60%'
        const fg = isDark ? 'oklch(0.94 0 0)' : 'oklch(0.16 0.005 285.8)'

        const bg = `color-mix(in srgb, ${accent} ${bgMix}, ${base})`
        const border = `color-mix(in srgb, ${accent} ${borderMix}, ${base})`

        return `
          --scope-accent: ${accent};
          --scope-primary: ${accent};
          --primary: ${accent};
          --ring: ${accent};
          --background: ${bg};
          --card: ${bg};
          --popover: ${bg};
          --sidebar: ${bg};
          --border: ${border};
          --muted: ${border};
          --sidebar-border: ${border};
          --foreground: ${fg};
        `
      }

      injectedStyle = (
        <style
          id="fleeets-theme-injection"
          dangerouslySetInnerHTML={{
            __html: `
              @media (prefers-color-scheme: light) { :root { ${generateVars(
                false
              )} } }
              @media (prefers-color-scheme: dark) { :root { ${generateVars(
                true
              )} } }
              html[data-theme="light"] { ${generateVars(false)} }
              html[data-theme="dark"], .dark { ${generateVars(true)} }
              #fleeets-theme-injection + * { transition: none !important; }
            `,
          }}
        />
      )
    } catch (e) {
      console.error('Theme injection failed', e)
    }
  }

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {injectedStyle}
        <script
          defer
          data-website-id="dfid_IIIw1GwhMjMbem9ip0p2b"
          data-domain="fleeets.vercel.app"
          src="https://datafa.st/js/script.js"
        ></script>
      </head>
      <body className={`min-h-screen bg-card font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreInitializer
            initialScopes={scopes}
            initialActiveScopeId={activeScopeId}
          />
          <ScopeThemeManager />

          {user ? (
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="w-full relative overflow-hidden">
                <LayoutClient>{children}</LayoutClient>
              </main>
            </div>
          ) : (
            <div className="min-h-screen w-full flex items-center justify-center">
              {children}
            </div>
          )}

          <PaywallModal />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
