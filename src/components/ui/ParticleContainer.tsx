'use client'

import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  dx: string
  dy: string
  duration: string
}

export function triggerReactionParticles(x: number, y: number, theme: 'fire' | 'lightning' | 'clap') {
  if (typeof window === 'undefined') return

  let color = '#D4FF3F' // volt lime
  if (theme === 'fire') {
    color = '#EF4444' // red/orange
  } else if (theme === 'lightning') {
    color = '#06B6D4' // aqua blue
  } else if (theme === 'clap') {
    color = '#10B981' // emerald green
  }

  const event = new CustomEvent('reaction-burst', {
    detail: { x, y, color }
  })
  window.dispatchEvent(event)
}

export default function ParticleContainer() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBurst = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number; color: string }>
      if (!customEvent.detail) return

      const { x, y, color } = customEvent.detail
      const count = 12 + Math.floor(Math.random() * 8) // 12~20 particles
      const newParticles: Particle[] = []

      for (let i = 0; i < count; i++) {
        const id = Date.now() + Math.random() + i
        const size = 4 + Math.random() * 6 // 4px ~ 10px

        // Random velocity direction
        const angle = Math.random() * Math.PI * 2
        // Random velocity distance
        const speed = 40 + Math.random() * 90
        const dx = `${Math.cos(angle) * speed}px`
        const dy = `${Math.sin(angle) * speed + 30}px` // slightly downward bias

        const duration = `${0.5 + Math.random() * 0.4}s`

        newParticles.push({
          id,
          x,
          y,
          size,
          color,
          dx,
          dy,
          duration
        })
      }

      setParticles(prev => [...prev, ...newParticles])
    };

    window.addEventListener('reaction-burst', handleBurst)
    return () => {
      window.removeEventListener('reaction-burst', handleBurst)
    }
  }, [])

  // Clean up finished particles
  const handleAnimationEnd = (id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="neon-particle"
          style={{
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            color: p.color,
            backgroundColor: p.color,
            // Pass values to CSS variables for keyframes
            ['--dx' as any]: p.dx,
            ['--dy' as any]: p.dy,
            ['--duration' as any]: p.duration
          }}
          onAnimationEnd={() => handleAnimationEnd(p.id)}
        />
      ))}
    </div>
  )
}
