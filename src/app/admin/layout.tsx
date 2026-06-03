'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { mockStore } from '@/lib/mockStore'
import { createClient } from '@/lib/supabase/client'
import { checkIsMock } from '@/lib/utils/mockCheck'
import RoleSwitcher from '@/components/layout/role-switcher'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const isMock = checkIsMock()
      
      if (isMock) {
        const profile = mockStore.getProfile()
        if (profile.role !== 'ADMIN' && !profile.can_view_admin) {
          router.replace('/')
        } else {
          setAuthorized(true)
        }
        setLoading(false)
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, can_view_admin')
          .eq('id', user.id)
          .single()

        if (!profile || (profile.role !== 'ADMIN' && !profile.can_view_admin)) {
          router.replace('/')
        } else {
          setAuthorized(true)
        }
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="text-xs text-slate-500 animate-pulse tracking-widest font-bold">운영자 권한 검증 중...</span>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex justify-center w-full relative overflow-hidden nike-grid-bg">
      {/* Dynamic Island style background typography for desktop */}
      <div className="hidden lg:flex fixed left-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0">
        <span className="text-[90px] font-black text-outline-white uppercase tracking-tighter leading-none select-none">
          SUWON
        </span>
        <span className="text-[90px] font-black text-brand-neon uppercase tracking-tighter leading-none select-none drop-shadow-[0_0_20px_rgba(212,255,63,0.2)]">
          RUNNING
        </span>
        <span className="text-[90px] font-black text-outline-white uppercase tracking-tighter leading-none select-none">
          CREW
        </span>
      </div>

      <div className="hidden lg:flex fixed right-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0 text-right">
        <span className="text-[90px] font-black text-outline-white uppercase tracking-tighter leading-none select-none">
          OWN
        </span>
        <span className="text-[90px] font-black text-slate-100 uppercase tracking-tighter leading-none select-none">
          YOUR
        </span>
        <span className="text-[90px] font-black text-outline-white uppercase tracking-tighter leading-none select-none">
          PACE
        </span>
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-neon/5 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-aqua/5 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />

      {/* 모바일 퍼스트 쉘 */}
      <div className="w-full max-w-md bg-[#0D111A]/85 border-x border-white/5 min-h-screen pb-10 relative flex flex-col shadow-[0_8px_50px_rgba(0,0,0,0.5)] z-10 backdrop-blur-2xl">
        {/* Unified Nike Run Club Style Premium Dark Glassmorphic Header */}
        <header className="bg-slate-900/80 backdrop-blur-md py-4 px-6 border-b border-white/5 flex items-center justify-center shrink-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-neon/5 to-brand-aqua/5 opacity-50" />
          <img 
            src="/logo.png" 
            alt="SRC Logo" 
            className="h-20 w-auto object-contain relative z-10" 
            style={{ 
              mixBlendMode: 'screen',
              transform: 'scale(2.3)',
              filter: 'brightness(1.35) contrast(1.15)'
            }} 
          />
        </header>

        {/* 어드민 상단 헤더 */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-slate-900/40">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>대시보드로 돌아가기</span>
          </Link>
          <span className="text-[10px] font-black tracking-widest text-brand-neon bg-brand-neon/10 px-2.5 py-0.5 rounded-full border border-brand-neon/20">
            운영자 모드
          </span>
        </header>

        <main className="flex-1 flex flex-col">
          {children}
        </main>
        
        {/* 개발용 플로팅 역할 체인저 */}
        <RoleSwitcher />
      </div>
    </div>
  )
}
