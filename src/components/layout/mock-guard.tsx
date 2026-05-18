'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { mockStore } from '@/lib/mockStore'

export default function MockGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Mock 모드인지 체크
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url'
    if (!isMock) return // 실제 Supabase가 동작하는 환경은 Next.js Edge Middleware가 통제하므로 이탈

    const isLoggedIn = localStorage.getItem('src_is_logged_in') === 'true'
    const profile = mockStore.getProfile()

    // 1. 카카오 로그인 미완료 상태인 경우 로그인 화면(/login)으로 강제 격리
    if (!isLoggedIn) {
      if (pathname !== '/login') {
        router.replace('/login')
      }
      return
    }

    // 2. 로그인 완료했으나 계정이 정지/비활성화(isActive === false)된 상태인 경우 대기실(/waiting)로 강제 격리
    if (!profile.is_active) {
      if (pathname !== '/waiting') {
        router.replace('/waiting')
      }
      return
    }

    // 3. 로그인 완료했으나 실명 온보딩 프로필(/setup-profile) 설정을 마치지 않은 경우 온보딩 페이지로 격리
    if (!profile.is_onboarded) {
      if (pathname !== '/setup-profile') {
        router.replace('/setup-profile')
      }
      return
    }

    // 4. 온보딩은 마쳤으나 운영진의 가입 승인 대기(role === 'WAITING') 상태인 경우 대기실(/waiting)로 격리
    if (profile.role === 'WAITING') {
      if (pathname !== '/waiting') {
        router.replace('/waiting')
      }
      return
    }

    // 5. 모든 승인이 완료된 회원(REGULAR, PACER, ADMIN)이 로그인, 온보딩, 대기실 페이지로 역진입하려 할 때 메인 대시보드로 강제 튕김
    if (pathname === '/login' || pathname === '/setup-profile' || pathname === '/waiting') {
      router.replace('/')
    }
  }, [mounted, pathname, router])

  // Hydration mismatch 방지용 로딩 프레임
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <span className="text-xs text-slate-550 animate-pulse tracking-widest font-bold">인증 세션 검증 중...</span>
      </div>
    )
  }

  return <>{children}</>
}
