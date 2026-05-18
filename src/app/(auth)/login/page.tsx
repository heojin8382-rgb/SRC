'use client'

import { useState, useEffect } from 'react'
import { signInWithKakao } from './actions'
import { mockStore } from '@/lib/mockStore'
import { Flame } from 'lucide-react'

export default function LoginPage() {
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 환경변수 감지를 통해 브라우저에서 Mock 모드 식별
    const mockCheck = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url'
    setIsMock(mockCheck)
  }, [])

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (isMock) {
      e.preventDefault()
      setLoading(true)

      // Mock 로그인 세션 등록
      localStorage.setItem('src_is_logged_in', 'true')

      // Mock 온보딩 리셋 후 페이지 이동
      const profile = mockStore.getProfile()
      profile.is_onboarded = false // 최초 온보딩 과정 테스트를 위해 false로 토글
      mockStore.saveProfile(profile)

      setTimeout(() => {
        window.location.href = '/setup-profile'
      }, 800)
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* 백그라운드 그라데이션 오버레이 및 광원 효과 */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4FF3F]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-500/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-sm flex flex-col items-center z-10">
        {/* 심볼 로고 */}
        <div className="mb-6 flex flex-col items-center animate-bounce-slow">
          <div className="w-16 h-16 rounded-full bg-[#1E293B] border-2 border-[#D4FF3F] flex items-center justify-center shadow-[0_0_15px_rgba(212,255,63,0.3)]">
            <Flame className="w-8 h-8 text-[#D4FF3F] fill-[#D4FF3F]/10" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-[#D4FF3F] bg-clip-text text-transparent">
            SUWON CREW
          </h1>
          <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase">
            Suwon Running Crew
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="w-full bg-[#1E293B]/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 flex flex-col items-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            반갑습니다 러너님! 🏃‍♂️
          </h2>
          <p className="text-sm text-slate-400 text-center mb-8 leading-relaxed">
            수원러닝크루(SRC)의 기록 인증 및<br />
            월간 생존 관리 시스템에 오신 것을 환영합니다.
          </p>

          {/* 카카오 로그인 폼 */}
          <form 
            onSubmit={handleLoginSubmit} 
            action={!isMock ? signInWithKakao : undefined} 
            className="w-full"
          >
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_12px_rgba(254,229,0,0.2)] cursor-pointer disabled:opacity-50"
            >
              {/* 카카오 고유 말풍선 모양 심볼 SVG */}
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 3C6.477 3 2 6.48 2 10.78c0 2.76 1.83 5.18 4.58 6.55-.18.66-.66 2.4-0.75 2.77-.12.48.18.47.38.34.16-.1 2.58-1.75 3.62-2.46.7.19 1.43.3 2.17.3 5.523 0 10-3.48 10-7.78C22 6.48 17.523 3 12 3z" />
              </svg>
              <span>{loading ? '로그인하는 중...' : '카카오톡으로 3초 만에 시작하기'}</span>
            </button>
          </form>

          <div className="mt-8 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isMock ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <span className="text-[11px] text-slate-500 tracking-wider">
              {isMock 
                ? 'Mock 시뮬레이션 모드로 작동 중입니다.' 
                : '안전한 Supabase OAuth 단일 인증을 사용합니다.'}
            </span>
          </div>
        </div>

        {/* 하단 푸터 카피라이트 */}
        <span className="text-[10px] text-slate-600 mt-12 tracking-widest">
          © 2026 SUWON RUNNING CREW. ALL RIGHTS RESERVED.
        </span>
      </div>
    </main>
  )
}
