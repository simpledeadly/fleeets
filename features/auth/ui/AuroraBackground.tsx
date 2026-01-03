'use client'

export function AuroraBackground({ hue, sat }: { hue: number; sat: number }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] pointer-events-none z-0">
      <div
        className="absolute inset-0 transition-all duration-1000 opacity-40 blur-[100px]"
        style={{
          background: `radial-gradient(
            circle at 50% 50%, 
            hsla(${hue}, ${sat}%, 40%, 0.4) 0%, 
            hsla(${hue + 40}, ${sat}%, 20%, 0.2) 30%, 
            transparent 60%
          )`,
        }}
      />
      <div
        className="absolute inset-0 transition-all duration-2000 opacity-30 blur-[120px] animate-pulse-slow"
        style={{
          background: `radial-gradient(
            circle at 40% 60%, 
            hsla(${hue - 30}, ${sat}%, 30%, 0.3) 0%, 
            transparent 50%
          )`,
        }}
      />
    </div>
  )
}
