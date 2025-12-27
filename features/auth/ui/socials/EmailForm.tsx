'use client'
import { useState } from 'react'
import { Mail, X, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface EmailFormProps {
  loading: boolean
  onBack: () => void
  onSubmit: (email: string) => void
}

export function EmailForm({ loading, onBack, onSubmit }: EmailFormProps) {
  const [email, setEmail] = useState('')

  return (
    <motion.div
      key="email"
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      className="w-full h-full relative"
    >
      <div className="relative h-full">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
          <Mail className="w-5 h-5" />
        </div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit(email)}
          placeholder="name@example.com"
          className="w-full h-full bg-black/20 border border-white/10 rounded-2xl pl-12 pr-12 text-white placeholder-white/30 outline-none focus:border-white/30 transition-all text-sm font-medium"
          autoFocus
        />
        {!email ? (
          <button
            onClick={onBack}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => onSubmit(email)}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-white text-black transition-all cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  )
}
