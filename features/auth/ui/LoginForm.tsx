'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Zap } from 'lucide-react'
import { AuroraBackground } from './AuroraBackground'
import { TelegramButton } from './TelegramButton'
import { useTelegramAuth } from '../model/use-telegram-auth'

export function LoginForm() {
  const { sessionId, status: tgStatus } = useTelegramAuth()
  const [aurora, setAurora] = useState({ hue: 240, sat: 60 })
  const [showQRCode, setShowQRCode] = useState(false)

  const randomizeAurora = () => {
    setAurora({
      hue: Math.floor(Math.random() * 360),
      sat: 60 + Math.floor(Math.random() * 40),
    })
  }

  const botLink = `https://t.me/fleeets_bot?start=${sessionId}`
  const isSyncing = tgStatus === 'success'

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 relative z-10 overflow-hidden min-h-screen w-full">
      {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)] pointer-events-none" /> */}
      <AuroraBackground hue={aurora.hue} sat={aurora.sat} />

      <div className="w-full max-w-95 flex flex-col items-center relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 flex flex-col items-center"
        >
          <div
            onClick={randomizeAurora}
            className="cursor-pointer mb-4 relative flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border shadow-sm transition-transform duration-150 hover:scale-102 active:scale-96 group animate-float"
          >
            <div className="absolute inset-0 rounded-2xl bg-linear-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            <Zap className="w-8 h-8 text-[#fbbf24] drop-shadow-[0_0:10px_rgba(251,191,36,0.2)]" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-foreground">
            Fleeets
          </h1>
          <p className="text-foreground/45 text-xs mt-1 font-mono tracking-wide">
            От хаоса в голове — к плану в руках
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-card/40 backdrop-blur-2xl border border-white/8 rounded-3xl p-3 md:p-6 shadow-sm overflow-hidden"
        >
          <TelegramButton url={botLink} isLoading={!sessionId || isSyncing} />

          <div className="relative flex py-2 items-center px-2">
            <div className="grow border-t border-border/80" />
            <span className="my-2 mx-4 text-xs text-foreground/40 uppercase tracking-widest font-semibold">
              или
            </span>
            <div className="grow border-t border-border/80" />
          </div>

          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait">
              {!showQRCode ? (
                <motion.button
                  key="show-qr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setShowQRCode(true)}
                  className="text-xs font-semibold text-foreground/40 hover:text-foreground transition-colors pb-2 uppercase tracking-wider cursor-pointer"
                >
                  Показать QR-код
                </motion.button>
              ) : (
                <motion.div
                  key="qr-container"
                  initial={{ opacity: 0, scale: 0.9, height: 0 }}
                  animate={{ opacity: 1, scale: 1, height: 'auto' }}
                  exit={{ opacity: 0, scale: 0.9, height: 0 }}
                  className="relative bg-white/5 backdrop-blur-md p-2 rounded-3xl border border-white/10 shadow-lg mt-2"
                >
                  <QRCodeSVG
                    value={botLink}
                    size={160}
                    level="Q"
                    bgColor="transparent"
                    marginSize={1}
                    fgColor="#fbbf24"
                  />
                  <button
                    onClick={() => setShowQRCode(false)}
                    className="absolute -top-1 -right-1 bg-background/80 rounded-full p-1 border border-border/50 hover:bg-background transition-all duration-150"
                  >
                    <Zap size={12} className="text-foreground/40" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center text-[12px] text-foreground/20"
        >
          Продолжая, вы принимаете{' '}
          <a href="#" className="hover:underline text-foreground/30">
            условия сервиса
          </a>
        </motion.p>
      </div>
    </div>
  )
}
