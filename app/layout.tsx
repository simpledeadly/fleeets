// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import StoreInitializer from './components/StoreInitializer'
import { PaywallModal } from '@/features/paywall'
import { ThemeProvider } from './components/ThemeProvider'
import { LayoutClient } from './components/LayoutClient'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/features/navigation'

export const metadata: Metadata = {
  title: 'Fleeets',
  description: 'Inbox Zero Protocol',
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

  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`min-h-screen bg-background font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreInitializer />

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
