// app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import BottomNav from "./components/BottomNav"
import StoreInitializer from "./components/StoreInitializer"
import { PaywallModal } from "@/features/paywall"

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
      <body className={`min-h-screen bg-background font-sans antialiased`}>
        <StoreInitializer initialItems={[]} />
        {children}
        <BottomNav />
        <PaywallModal />
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}