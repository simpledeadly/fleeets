// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import BottomNav from "./components/BottomNav"
import StoreInitializer from "./components/StoreInitializer"

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
        <StoreInitializer initialItems={[]} />
        {children}
        <BottomNav />
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}