'use client'

import { LoginForm } from '@/features/auth'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background animate-in fade-in duration-150">
      <LoginForm />
    </main>
  )
}
