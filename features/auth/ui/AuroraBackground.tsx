'use client'

export function AuroraBackground({ hue, sat }: { hue: number; sat: number }) {
  return (
    <div className="absolute mt-2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-350 h-350 pointer-events-none z-0 animate-pulse-slow">
      <div
        className="absolute inset-0 transition-all duration-1000 opacity-60"
        style={{
          background: `radial-gradient(
            circle at center, 
            hsla(${hue}, ${sat}%, 25%, 0.3) 0%, 
            hsla(${hue + 30}, ${sat}%, 10%, 0.1) 40%, 
            transparent 45%
          )`,
        }}
      />
    </div>
  )
}
