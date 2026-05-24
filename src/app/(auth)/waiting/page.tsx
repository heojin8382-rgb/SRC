'use client'

import { useState, useEffect } from 'react'
import { mockStore, Profile } from '@/lib/mockStore'
import { createClient } from '@/lib/supabase/client'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { Clock, ShieldAlert, LogOut } from 'lucide-react'

export default function WaitingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isMock, setIsMock] = useState(false)

  useEffect(() => {
    const mockCheck = checkIsMock()
    setIsMock(mockCheck)
    
    if (mockCheck) {
      // 로컬 스토리지에서 프로필 로드
      setProfile(mockStore.getProfile())
    } else {
      // 실제 Supabase 서버에서 프로필 로드
      const loadProfile = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (data) {
            setProfile(data as Profile)
          }
        }
      }
      loadProfile()
    }
  }, [])

  const handleSignOut = async () => {
    if (isMock && profile) {
      // Mock 로그인 세션 제거
      localStorage.removeItem('src_is_logged_in')

      // Mock 모드 로그아웃: 온보딩 상태를 리셋하여 로그인 화면으로 복귀 시뮬레이션
      const updated = { ...profile, is_onboarded: false, role: 'WAITING' as Profile['role'] }
      mockStore.saveProfile(updated)
      window.location.href = '/login'
    } else {
      // 실제 환경: Supabase Auth 로그아웃 처리
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#EAF2FA] text-slate-900 flex flex-col items-center justify-center">
        <span className="text-xs text-slate-500 animate-pulse">로딩 중...</span>
      </main>
    )
  }

  const nickname = profile.nickname || '신규 러너'
  const avatarUrl = profile.avatar_url
  const isActive = profile.is_active

  return (
    <main className="min-h-screen bg-[#EAF2FA] text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* 백그라운드 광원 효과 */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-rose-500/3 rounded-full blur-[120px]" />

      <div className="w-full max-w-sm z-10 flex flex-col items-center animate-fadeIn">
        {/* 대기 안내 카드 */}
        <div className="w-full bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-8 flex flex-col items-center shadow-xl">
          
          {/* 상태별 아이콘 분기 */}
          {isActive ? (
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-250 flex items-center justify-center mb-6 animate-pulse">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-6 animate-bounce-slow">
              <ShieldAlert className="w-8 h-8 text-rose-600" />
            </div>
          )}

          {/* 유저 아바타 & 닉네임 노출 */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border border-slate-200 mb-2"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
              👤
            </div>
          )}
          
          <span className="text-sm font-semibold text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 px-3 py-1 rounded-full mb-6">
            {nickname}
          </span>

          {isActive ? (
            <>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                가입 승인 대기 중
              </h2>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                크루 가입 정보 입력이 성공적으로 완료되었습니다.<br />
                운영진이 확인 후 **정회원 승인**을 완료하면<br />
                대시보드와 러닝 기록 인증 기능을 사용할 수 있습니다.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold tracking-tight text-rose-600 mb-2">
                비활성화된 계정
              </h2>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                현재 탈퇴 또는 비활성화 처리되어 정지된 계정입니다.<br />
                다시 크루 활동을 복구하고자 하시는 경우,<br />
                SRC 운영진(ADMIN)에게 별도 문의 및 승인을 요청해 주세요.
              </p>
            </>
          )}

          <div className="w-full h-[1px] bg-slate-200 my-6" />

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleSignOut}
            className="w-full h-12 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer text-xs shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>다른 카카오 계정으로 로그인 (로그아웃)</span>
          </button>
        </div>
      </div>
    </main>
  )
}
