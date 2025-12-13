// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google" // Используем Inter как стандарт
import "./globals.css"
import { cn } from "@/lib/utils" // Утилита от Shadcn для склеивания классов

const fontSans = Inter({
  subsets: ["latin"],
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
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        {children}
      </body>
    </html>
  )
}