'use client'

import { useState } from 'react'
import { setupProfile } from './actions'
import { mockStore } from '@/lib/mockStore'
import { Sparkles, Check, User } from 'lucide-react'

export default function SetupProfilePage() {
  const [realName, setRealName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // 1950년부터 2015년까지 역순으로 생성 (크루 가입 적정 연령대 중심)
  const years = Array.from({ length: 66 }, (_, i) => 2015 - i)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!realName.trim()) {
      setError('실명을 입력해 주세요.')
      return
    }
    if (!birthYear) {
      setError('출생년도를 선택해 주세요.')
      return
    }
    if (!gender) {
      setError('성별을 선택해 주세요.')
      return
    }

    // Mock 모드 확인
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url'
    if (isMock) {
      setPending(true)
      setTimeout(() => {
        const shortYear = birthYear.slice(-2)
        const nickname = `${realName.trim()}/${shortYear}/${gender}`
        
        const profile = mockStore.getProfile()
        profile.real_name = realName.trim()
        profile.birth_year = parseInt(birthYear, 10)
        profile.gender = gender
        profile.nickname = nickname
        profile.is_onboarded = true
        profile.role = 'REGULAR' // 테스트 편의를 위해 가입과 동시에 REGULAR로 즉시 셋업
        
        mockStore.saveProfile(profile)
        setPending(false)
        window.location.href = '/'
      }, 800)
      return
    }

    setPending(true)
    const formData = new FormData()
    formData.append('realName', realName.trim())
    formData.append('birthYear', birthYear)
    formData.append('gender', gender)

    try {
      const res = await setupProfile(formData)
      if (res && !res.success) {
        setError(res.error || '프로필 저장에 실패했습니다.')
      }
    } catch (err: any) {
      setError('예기치 못한 오류가 발생했습니다.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* 백그라운드 광원 효과 */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4FF3F]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-500/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* 온보딩 진행 단계 */}
        <div className="flex items-center justify-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-1.5 text-slate-500">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/30">
              <Check className="w-3 h-3" />
            </div>
            <span>카카오 연동</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5 text-[#D4FF3F] font-bold">
            <div className="w-5 h-5 rounded-full bg-[#D4FF3F]/10 text-[#D4FF3F] flex items-center justify-center text-xs font-bold border border-[#D4FF3F]/30 animate-pulse">
              2
            </div>
            <span>가입정보 입력</span>
          </div>
        </div>

        {/* 폼 카드 */}
        <div className="bg-[#1E293B]/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#D4FF3F]" />
            <h2 className="text-xl font-bold tracking-tight text-white">크루 정보 입력</h2>
          </div>
          <p className="text-xs text-slate-400 mb-8 leading-relaxed">
            러닝 기록 인증 및 랭킹 산정을 위해 실명 정보를 정확히 기입해 주세요.<br />
            입력하신 정보를 바탕으로 크루 내 **가상 닉네임**이 자동 구성됩니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이름 입력 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block tracking-wider">
                이름 (실명)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  maxLength={10}
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-slate-800 focus:border-[#D4FF3F] focus:shadow-[0_0_10px_rgba(212,255,63,0.15)] rounded-xl px-4 text-sm outline-none transition-all duration-200"
                />
                <User className="w-4 h-4 text-slate-500 absolute right-4 top-4" />
              </div>
            </div>

            {/* 출생년도 선택 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block tracking-wider">
                출생년도
              </label>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full h-12 bg-slate-900/60 border border-slate-800 focus:border-[#D4FF3F] focus:shadow-[0_0_10px_rgba(212,255,63,0.15)] rounded-xl px-4 text-sm outline-none transition-all duration-200 cursor-pointer appearance-none text-slate-300"
              >
                <option value="">년도 선택</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}년생
                  </option>
                ))}
              </select>
            </div>

            {/* 성별 선택 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block tracking-wider">
                성별
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setGender('남')}
                  className={`h-12 rounded-xl border font-bold text-sm transition-all duration-300 flex items-center justify-center cursor-pointer ${
                    gender === '남'
                      ? 'border-[#D4FF3F] bg-[#D4FF3F]/10 text-[#D4FF3F] shadow-[0_0_10px_rgba(212,255,63,0.15)]'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  남성
                </button>
                <button
                  type="button"
                  onClick={() => setGender('여')}
                  className={`h-12 rounded-xl border font-bold text-sm transition-all duration-300 flex items-center justify-center cursor-pointer ${
                    gender === '여'
                      ? 'border-[#D4FF3F] bg-[#D4FF3F]/10 text-[#D4FF3F] shadow-[0_0_10px_rgba(212,255,63,0.15)]'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  여성
                </button>
              </div>
            </div>

            {/* 닉네임 미리보기 */}
            {realName && birthYear && gender && (
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center gap-1.5 animate-fadeIn">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                  자동 구성될 가상 닉네임
                </span>
                <span className="text-lg font-black text-[#D4FF3F] tracking-wide">
                  {realName}/{birthYear.slice(-2)}/{gender}
                </span>
              </div>
            )}

            {/* 에러 출력 */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={pending}
              className={`w-full h-14 font-extrabold text-sm tracking-wide rounded-2xl transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center ${
                pending
                  ? 'bg-slate-800 text-slate-500'
                  : 'bg-[#D4FF3F] text-[#0B0F19] hover:bg-[#D4FF3F]/90 active:scale-[0.98] shadow-[0_4px_12px_rgba(212,255,63,0.15)]'
              }`}
            >
              {pending ? '프로필 저장 중...' : '프로필 설정 완료'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
