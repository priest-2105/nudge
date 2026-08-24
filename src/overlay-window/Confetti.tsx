import type { CSSProperties } from 'react'

const COLORS = ['var(--coral)', 'var(--mint)', 'var(--sun)', 'var(--ink)']

// Each piece gets its own burst angle/distance/rotation/delay so the
// explosion doesn't look mechanically uniform. Fixed count keeps this a
// pure CSS animation — no canvas, no library.
const PIECES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * 2 * Math.PI + (i % 2 === 0 ? 0.15 : -0.15)
  const distance = 46 + ((i * 37) % 40)
  return {
    tx: Math.round(Math.cos(angle) * distance),
    ty: Math.round(Math.sin(angle) * distance - distance * 0.4), // bias upward
    rot: (i * 53) % 360,
    delay: (i % 5) * 18,
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0
  }
})

interface Props {
  active: boolean
}

export function Confetti({ active }: Props): JSX.Element | null {
  if (!active) return null
  return (
    <div className="confetti-burst" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`confetti-piece${p.round ? ' is-round' : ''}`}
          style={
            {
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--rot': `${p.rot}deg`,
              animationDelay: `${p.delay}ms`,
              background: p.color
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
