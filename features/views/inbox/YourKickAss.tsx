'use client'
import Lottie from 'lottie-react'
import animation from '@/assets/your-kick-ass.json'

export function YourKickAss() {
  return (
    <div className="w-40 h-40">
      <Lottie animationData={animation} loop={true} />
    </div>
  )
}
