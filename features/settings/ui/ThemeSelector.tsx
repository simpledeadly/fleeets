"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { THEME_PRESETS } from "@/features/appearance"
import { Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function ThemeSelector() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className="grid grid-cols-4 gap-3">
      {THEME_PRESETS.map((t) => {
        const isActive = theme === t.id

        return (
          <motion.button
            key={t.id}
            onClick={() => setTheme(t.id)}
            // 1. ТАКТИЛЬНОСТЬ: Пружинистое нажатие
            whileTap={{ scale: 1 }}
            whileHover={{ scale: 1 }}
            // 2. СОСТОЯНИЕ: Плавный переход масштаба и прозрачности
            animate={{
              scale: isActive ? 1 : 1,
              opacity: isActive ? 1 : 0.6
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 outline-none cursor-pointer",
              t.previewClass,
              // Рамку рисуем через shadow/ring, но анимируем её появление плавно
              isActive
                ? "ring-2 ring-offset-2 ring-offset-background ring-primary shadow-lg"
                : "hover:opacity-100"
            )}
          >
            {/* Иконка */}
            <motion.div
              animate={{
                scale: isActive ? 1.1 : 1,
                y: isActive ? -2 : 0 // Чуть приподнимаем иконку, чтобы дать место галочке
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <t.icon size={20} strokeWidth={2} />
            </motion.div>

            <span className="text-xs font-medium tracking-wide">
              {t.label}
            </span>

            {/* Галочка (твоя любимая, оставили как есть) */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0 }}
                  className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm z-10"
                >
                  <Check size={14} strokeWidth={4} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )
      })}
    </div>
  )
}