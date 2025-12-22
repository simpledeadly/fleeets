'use client'
import Lottie from 'lottie-react'
import animation from '@/assets/cool-emoji.json'

export function CoolEmoji() {
  return (
    <div className="w-40 h-40">
      <Lottie animationData={animation} loop={true} />
    </div>
  )
}
