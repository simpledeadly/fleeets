'use client'
import { Mail } from 'lucide-react'
import { motion } from 'framer-motion'

export function SocialsSection({
  onGoogle,
  onEmailClick,
}: {
  onGoogle: () => void
  onEmailClick: () => void
}) {
  return (
    <motion.div
      key="socials"
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      className="flex justify-center gap-4 w-full h-full"
    >
      <button
        onClick={onGoogle}
        className="flex-1 h-full rounded-2xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-3 group text-white/80 hover:text-white cursor-pointer"
      >
        <GoogleIcon />
        <span className="text-sm font-medium">Google</span>
      </button>

      <button
        onClick={onEmailClick}
        className="flex-1 h-full rounded-2xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-3 group text-white/80 hover:text-white cursor-pointer"
      >
        <Mail className="w-5 h-5" />
        <span className="text-sm font-medium">Почта</span>
      </button>
    </motion.div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
