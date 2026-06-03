'use client'

import React, { useState, useRef } from 'react'
import { triggerReactionParticles } from '@/components/ui/ParticleContainer'

interface BadgeCardProps {
  id: string
  name: string
  emoji: string
  description: string
  color: string
  isUnlocked: boolean
}

export default function BadgeCard({
  id,
  name,
  emoji,
  description,
  color,
  isUnlocked
}: BadgeCardProps) {
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})
  const [showTooltip, setShowTooltip] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isUnlocked || !cardRef.current) return

    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    
    // Mouse coordinates relative to card
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Center coordinates
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Maximum tilt angle (degrees)
    const maxTilt = 15

    // Calculate rotation based on cursor distance from center
    const rotateX = ((centerY - y) / centerY) * maxTilt
    const rotateY = ((x - centerX) / centerX) * maxTilt

    // Calculate shine gradient position (0% to 100%)
    const shineX = (x / rect.width) * 100
    const shineY = (y / rect.height) * 100

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`,
      boxShadow: '0 15px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 255, 255, 0.05)',
      // Custom variables passed to CSS radial gradient shine overlay
      ['--shine-x' as any]: `${shineX}%`,
      ['--shine-y' as any]: `${shineY}%`
    })
  }

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      boxShadow: 'none'
    })
    setShowTooltip(false)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isUnlocked || !cardRef.current) return
    const touch = e.touches[0]
    const card = cardRef.current
    const rect = card.getBoundingClientRect()

    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const maxTilt = 12
    const rotateX = ((centerY - y) / centerY) * maxTilt
    const rotateY = ((x - centerX) / centerX) * maxTilt

    const shineX = (x / rect.width) * 100
    const shineY = (y / rect.height) * 100

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      ['--shine-x' as any]: `${shineX}%`,
      ['--shine-y' as any]: `${shineY}%`
    })
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setShowTooltip(prev => !prev)
    if (isUnlocked) {
      let theme: 'fire' | 'lightning' | 'clap' = 'clap'
      if (id === 'speed' || id === 'pb_master') {
        theme = 'lightning'
      } else if (id === 'iron' || id === 'pioneer') {
        theme = 'fire'
      }
      triggerReactionParticles(e.clientX, e.clientY, theme)
    }
  }

  return (
    <div className="relative group/badge">
      <div
        ref={cardRef}
        className={`hologram-card preserve-3d border rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer select-none min-h-[105px] transition-all duration-300 ${
          isUnlocked
            ? `${color} hover:border-[#2563EB]/25 active:scale-98 shadow-sm`
            : 'bg-slate-50 border-slate-200/60 opacity-60 text-slate-400 hover:opacity-75'
        }`}
        style={tiltStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Hologram shine layer for unlocked cards */}
        {isUnlocked && <div className="hologram-shine-overlay" />}

        {/* Badge content */}
        <div className="relative z-10 flex flex-col items-center gap-1.5 preserve-3d">
          {isUnlocked ? (
            <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.25)] select-none">
              {emoji}
            </span>
          ) : (
            <div className="relative w-9 h-9 flex items-center justify-center">
              <span className="text-2xl filter grayscale opacity-40 select-none">{emoji}</span>
              <span className="absolute text-[8px] bottom-0 right-0 bg-slate-200 border border-slate-300 rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                🔒
              </span>
            </div>
          )}

          <span className={`text-[10px] font-black tracking-tight ${isUnlocked ? '' : 'text-slate-400'}`}>
            {name}
          </span>
          
          <span className="text-[7.5px] opacity-75 font-semibold">
            {isUnlocked ? '달성 완료 ✨' : '잠김'}
          </span>
        </div>
      </div>

      {/* Tooltip / Condition Bubble */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[110%] w-48 bg-white border border-slate-200 p-3 rounded-xl shadow-lg z-50 text-[9.5px] leading-relaxed text-slate-600 font-semibold animate-fadeIn select-none">
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" />
          <p className="font-extrabold text-slate-900 mb-1 flex items-center gap-1">
            <span>{isUnlocked ? '🎉 뱃지 획득 완료' : '🔒 잠금 해제 조건'}</span>
          </p>
          <p>{description}</p>
        </div>
      )}
    </div>
  )
}
