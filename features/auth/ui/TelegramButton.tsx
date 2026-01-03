'use client'

import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TelegramButtonProps {
  url: string
  isLoading: boolean
}

export function TelegramButton({ url, isLoading }: TelegramButtonProps) {
  return (
    <a
      href={url}
      className={cn(
        'block relative overflow-hidden rounded-xl transition-all duration-150 active:scale-[0.98] shadow-[0_4px_20px_rgba(36,161,222,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] group',
        isLoading && 'pointer-events-none opacity-80'
      )}
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* Фон с градиентом */}
      <div className="absolute inset-0 bg-linear-to-r from-[#24A1DE] to-[#2095cf] group-hover:scale-105 transition-transform duration-300" />

      {/* Блик */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />

      <div className="relative flex items-center justify-center gap-3 py-3">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
        ) : (
          <>
            <Send className="w-4 h-4 text-white drop-shadow-sm transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span className="text-md font-semibold text-white tracking-wide drop-shadow-sm">
              Войти через Telegram
            </span>
          </>
        )}
      </div>
    </a>
  )
}
