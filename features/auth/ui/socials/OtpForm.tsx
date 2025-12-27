'use client'
import { useState } from 'react'
import { ChevronLeft, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface OtpFormProps {
  loading: boolean
  onBack: () => void
  onSubmit: (code: string) => void
}

export function OtpForm({ loading, onBack, onSubmit }: OtpFormProps) {
  const [code, setCode] = useState('')

  return (
    <motion.div
      key="otp"
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      className="w-full h-full relative"
    >
      <div className="relative h-full">
        <button
          onClick={onBack}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all z-10 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit(code)}
          placeholder="Код из письма"
          className="w-full h-full bg-black/20 border border-blue-500/30 rounded-2xl pl-12 pr-12 text-center text-white placeholder-white/20 outline-none focus:border-blue-500/60 transition-all text-lg tracking-widest font-mono"
          autoFocus
        />
        <button
          onClick={() => onSubmit(code)}
          disabled={loading || !code}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-blue-500 text-white hover:bg-blue-400 transition-all cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </motion.div>
  )
}
