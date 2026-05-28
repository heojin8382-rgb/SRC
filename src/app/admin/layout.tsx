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
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <span className="text-xs text-slate-500 animate-pulse tracking-widest font-bold">운영자 권한 검증 중...</span>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-900 flex justify-center w-full relative overflow-hidden nike-grid-bg">
      {/* Dynamic Island style background typography for desktop */}
      <div className="hidden lg:flex fixed left-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0">
        <span className="text-[110px] font-black text-zinc-900/30 uppercase tracking-tighter leading-none select-none">
          SUWON
        </span>
        <span className="text-[110px] font-black text-[#84CC16]/95 uppercase tracking-tighter leading-none select-none drop-shadow-[0_0_30px_rgba(132,204,22,0.15)]">
          RUNNING
        </span>
        <span className="text-[110px] font-black text-zinc-900/30 uppercase tracking-tighter leading-none select-none">
          CREW
        </span>
      </div>

      <div className="hidden lg:flex fixed right-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0 text-right">
        <span className="text-[110px] font-black text-zinc-900/30 uppercase tracking-tighter leading-none select-none">
          RUN
        </span>
        <span className="text-[110px] font-black text-zinc-900/30 uppercase tracking-tighter leading-none select-none">
          OR
        </span>
        <span className="text-[110px] font-black text-[#84CC16]/95 uppercase tracking-tighter leading-none select-none drop-shadow-[0_0_30px_rgba(132,204,22,0.15)]">
          DIE
        </span>
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#84CC16]/8 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/6 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />

      {/* 모바일 퍼스트 쉘 */}
      <div className="w-full max-w-md bg-background border-x border-zinc-900 min-h-screen pb-10 relative flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] z-10">
        {/* Unified Nike Run Club Style Premium Black Header */}
        <header className="bg-black py-5 px-6 border-b border-zinc-900 flex items-center justify-center shrink-0">
          <img src="/logo.png" alt="SRC Logo" className="h-14 w-auto object-contain" />
        </header>

        {/* 어드민 상단 헤더 */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 bg-slate-50/50">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>대시보드로 돌아가기</span>
          </Link>
          <span className="text-[10px] font-black tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
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
