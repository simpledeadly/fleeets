'use client'
import Lottie from 'lottie-react'
import animation from '@/assets/lottie/loveduck.json'

export function Loveduck() {
  return (
    <div className="w-40 h-40">
      <Lottie animationData={animation} loop={true} />
    </div>
  )
}
