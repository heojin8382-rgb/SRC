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
        if (profile.role !== 'ADMIN') {
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
          .select('role')
          .eq('id', user.id)
          .single()

        if (!profile || profile.role !== 'ADMIN') {
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
    <div className="min-h-screen bg-gradient-to-tr from-[#A5C9FF] via-[#E2EAF8] to-[#7CB0FF] text-slate-900 flex justify-center w-full relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none animate-pulseGlow" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-emerald-500/4 rounded-full blur-[120px] pointer-events-none animate-pulseGlow" />

      {/* 모바일 퍼스트 쉘 */}
      <div className="w-full max-w-md bg-background border-x border-slate-200/80 min-h-screen pb-10 relative flex flex-col shadow-[0_0_50px_rgba(15,23,42,0.06)] z-10">
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
