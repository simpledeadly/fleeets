'use client'
import { useState, useEffect } from 'react'

export function useTypewriter(text: string, speed: number = 10) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    setDisplayedText('') // Сброс при смене текста
    if (!text) return

    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i))
        i++
      } else {
        clearInterval(timer)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed])

  return displayedText
}
