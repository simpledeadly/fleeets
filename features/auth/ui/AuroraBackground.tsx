'use client'

export function AuroraBackground({ hue, sat }: { hue: number; sat: number }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-250 h-250 pointer-events-none animate-pulse-slow transition-colors duration-1000">
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle closest-side, hsla(${hue}, ${sat}%, 60%, 0.25), hsla(${
            hue + 40
          }, ${sat}%, 50%, 0.1), transparent)`,
        }}
      />
    </div>
  )
}
