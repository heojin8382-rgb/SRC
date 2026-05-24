'use client'

import { useState, useEffect } from 'react'
import { mockStore, Profile } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { Settings, ShieldAlert, Sparkles } from 'lucide-react'

export default function RoleSwitcher() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isMock, setIsMock] = useState(false)
  const [hasMockCookie, setHasMockCookie] = useState(false)

  // 컴포넌트 마운트 후 로컬 스토리지 데이터 로드
  useEffect(() => {
    const mockCheck = checkIsMock()
    setIsMock(mockCheck)
    setProfile(mockStore.getProfile())
    setHasMockCookie(document.cookie.split('; ').some(row => row.trim().startsWith('src_mock=true')))
  }, [])

  if (!isMock || !profile) return null

  const handleRoleChange = (role: Profile['role']) => {
    const updated = { ...profile, role }
    mockStore.saveProfile(updated)
    setProfile(updated)
    window.location.reload() // 프로필 교체 후 페이지 리로드로 미들웨어/라우팅 즉각 갱신
  }

  const handleToggle = (key: 'is_exempted' | 'is_active' | 'is_onboarded') => {
    const updated = { ...profile, [key]: !profile[key] }
    mockStore.saveProfile(updated)
    setProfile(updated)
    window.location.reload()
  }

  const handleExitMockMode = () => {
    // 1. 쿠키 제거
    document.cookie = "src_mock=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    // 2. 로그인 세션 제거
    localStorage.removeItem('src_is_logged_in')
    // 3. 페이지 새로고침하여 로그인 화면으로 강제 유도
    window.location.href = '/login'
  }

  // 역할군 라벨 스타일 매핑
  const roles: { value: Profile['role']; label: string; color: string }[] = [
    { value: 'WAITING', label: '⏳ 대기', color: 'bg-slate-800 text-slate-400 border-slate-700' },
    { value: 'REGULAR', label: '🔥 정회원', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'PACER', label: '🎈 페이서', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { value: 'ADMIN', label: '⚡ 운영자', color: 'bg-[#D4FF3F]/10 text-[#D4FF3F] border-[#D4FF3F]/20' },
  ]

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end">
      {/* 토글 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-[#1E293B] border border-slate-700 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        title="Mock 개발자 도구"
      >
        <Settings className={`w-5 h-5 text-[#D4FF3F] ${isOpen ? 'animate-spin' : ''}`} />
      </button>

      {/* 옵션 패널 */}
      {isOpen && (
        <div className="mt-2 w-56 bg-[#1A2235]/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl animate-scaleUp">
          <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-850">
            <Sparkles className="w-4 h-4 text-[#D4FF3F]" />
            <span className="text-[11px] font-black text-slate-300 tracking-wider">MOCK 테스팅 패널</span>
          </div>

          {/* 역할 스위칭 라디오 그룹 */}
          <div className="space-y-1.5 mb-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              내 역할 스위칭
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {roles.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRoleChange(r.value)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    profile.role === r.value
                      ? 'border-[#D4FF3F] text-[#D4FF3F] bg-[#D4FF3F]/5'
                      : 'border-slate-800 text-slate-400 hover:border-slate-750 bg-slate-900/30'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 추가 불리언 토글 제어 */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              상태 플래그 토글
            </label>

            {/* 면제 여부 */}
            <button
              onClick={() => handleToggle('is_exempted')}
              className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                profile.is_exempted
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                  : 'border-slate-800 text-slate-400 bg-slate-900/30'
              }`}
            >
              <span>🩹 부상 면제 상태</span>
              <span className="text-[9px] uppercase">{profile.is_exempted ? 'ON' : 'OFF'}</span>
            </button>

            {/* 온보딩 완료 여부 */}
            <button
              onClick={() => handleToggle('is_onboarded')}
              className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                profile.is_onboarded
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-slate-800 text-slate-400 bg-slate-900/30'
              }`}
            >
              <span>📝 프로필 온보딩</span>
              <span className="text-[9px] uppercase">{profile.is_onboarded ? 'ON' : 'OFF'}</span>
            </button>

            {/* 활성 회원 상태 */}
            <button
              onClick={() => handleToggle('is_active')}
              className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                profile.is_active
                  ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                  : 'border-slate-800 text-slate-400 bg-slate-900/30'
              }`}
            >
              <span>🚫 활성 계정 상태</span>
              <span className="text-[9px] uppercase">{profile.is_active ? 'ACTIVE' : 'DEACTIVATED'}</span>
            </button>
          </div>

          {/* 실제 Supabase 연동 모드로 전환 버튼 */}
          {hasMockCookie && (
            <button
              onClick={handleExitMockMode}
              className="w-full mt-3 py-2 px-3 rounded-lg text-[10px] font-black border border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center gap-1 transition-all duration-200 cursor-pointer"
            >
              🔌 실제 Supabase 모드로 전환
            </button>
          )}

          <div className="mt-3 pt-2 border-t border-slate-850 flex items-center gap-1 text-[9px] text-slate-500 justify-center">
            <ShieldAlert className="w-3 h-3 text-[#D4FF3F]" />
            <span>테스트 즉시 미들웨어 반영</span>
          </div>
        </div>
      )}
    </div>
  )
}
