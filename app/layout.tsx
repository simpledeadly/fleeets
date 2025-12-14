// app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import StoreInitializer from "./components/StoreInitializer"
import { PaywallModal } from "@/features/paywall"
import { ThemeProvider } from './components/ThemeProvider'
import { LayoutClient } from './components/LayoutClient'

const fontSans = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Fleeets",
  description: "Inbox Zero Protocol",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`min-h-screen bg-background font-sans antialiased ${fontSans.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreInitializer />
          <LayoutClient>
            {children}
          </LayoutClient>
          <PaywallModal />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}