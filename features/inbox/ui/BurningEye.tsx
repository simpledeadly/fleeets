'use client'
import Lottie from 'lottie-react'
import eyeAnimation from '@/assets/burning-eye.json' // Положи скачанный JSON в папку assets

export function BurningEye() {
  return (
    <div className="w-4 h-4">
      <Lottie animationData={eyeAnimation} loop={true} />
    </div>
  )
}
