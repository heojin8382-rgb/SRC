'use client'

import { useState, useEffect } from 'react'
import { signInWithKakao } from './actions'
import { mockStore } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { Flame } from 'lucide-react'

export default function LoginPage() {
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 환경변수 및 쿠키 감지를 통해 브라우저에서 Mock 모드 식별
    setIsMock(checkIsMock())
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

  const handleForceMockLogin = () => {
    setLoading(true)
    
    // 1. 쿠키로 Mock 모드 강제 세팅 (1년 만료)
    document.cookie = "src_mock=true; path=/; max-age=31536000"
    
    // 2. Mock 로그인 세션 등록
    localStorage.setItem('src_is_logged_in', 'true')

    // 3. Mock 온보딩 리셋 후 페이지 이동
    const profile = mockStore.getProfile()
    profile.is_onboarded = false
    mockStore.saveProfile(profile)

    setTimeout(() => {
      window.location.href = '/setup-profile'
    }, 800)
  }

  return (
    <main className="min-h-screen bg-[#EAF2FA] text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* 백그라운드 그라데이션 오버레이 및 광원 효과 */}
      <div className="absolute top-[-15%] left-[-15%] w-[450px] h-[450px] bg-blue-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[450px] h-[450px] bg-emerald-500/3 rounded-full blur-[110px] pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center z-10 animate-fadeIn">
        {/* 심볼 로고 */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white border-2 border-[#2563EB] flex items-center justify-center shadow-md">
            <Flame className="w-8 h-8 text-[#2563EB] fill-[#2563EB]/10 animate-pulse" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-widest bg-gradient-to-r from-slate-900 via-slate-700 to-[#2563EB] bg-clip-text text-transparent uppercase">
            SUWON CREW
          </h1>
          <p className="text-[9px] text-slate-500 font-extrabold tracking-widest uppercase mt-1">
            Suwon Running Crew
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 flex flex-col items-center shadow-xl relative overflow-hidden">
          {/* 카드 내부 작은 앵글 라인 광원 */}
          <div className="absolute top-[-30px] right-[-30px] w-20 h-20 bg-blue-500/5 rounded-full blur-[15px] pointer-events-none" />

          <h2 className="text-base font-black tracking-tight text-slate-900 mb-2 text-center">
            반갑습니다 러너님! 🏃‍♂️
          </h2>
          <p className="text-[11px] text-slate-500 text-center mb-8 leading-relaxed">
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
              className="w-full h-13 bg-[#FEE500] hover:bg-[#FEE500]/95 text-[#191919] font-black text-xs tracking-wider rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 transform active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50"
            >
              {/* 카카오 고유 말풍선 모양 SVG */}
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 3C6.477 3 2 6.48 2 10.78c0 2.76 1.83 5.18 4.58 6.55-.18.66-.66 2.4-0.75 2.77-.12.48.18.47.38.34.16-.1 2.58-1.75 3.62-2.46.7.19 1.43.3 2.17.3 5.523 0 10-3.48 10-7.78C22 6.48 17.523 3 12 3z" />
              </svg>
              <span>{loading ? '로그인 중...' : '카카오톡으로 3초 만에 시작하기'}</span>
            </button>
          </form>

          {/* 개발자 체험 모드 강제 활성화 버튼 */}
          {!isMock && (
            <button
              onClick={handleForceMockLogin}
              disabled={loading}
              className="mt-3 w-full h-11 bg-slate-50 border border-slate-200 hover:border-slate-350 hover:text-slate-800 text-slate-600 text-[10px] font-bold tracking-wider rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              개발자 체험 모드(Mock)로 시작하기
            </button>
          )}

          <div className="mt-7 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isMock ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <span className="text-[9px] text-slate-500 tracking-wider font-semibold">
              {isMock 
                ? 'Mock 시뮬레이션 모드로 작동 중입니다.' 
                : '안전한 Supabase OAuth 단일 인증을 사용합니다.'}
            </span>
          </div>
        </div>

        {/* 하단 푸터 카피라이트 */}
        <span className="text-[10px] text-slate-400 mt-12 tracking-widest">
          © 2026 SUWON RUNNING CREW. ALL RIGHTS RESERVED.
        </span>
      </div>
    </main>
  )
}
