'use client'

import { useState } from 'react'
import { setupProfile } from './actions'
import { mockStore } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
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
    const isMock = checkIsMock()
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
      if (res && res.success) {
        window.location.href = '/'
      } else if (res && !res.success) {
        setError(res.error || '프로필 저장에 실패했습니다.')
      }
    } catch (e) {
      console.error(e)
      setError('예기치 못한 오류가 발생했습니다.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#EAF2FA] text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* 백그라운드 광원 효과 */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-500/3 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10 animate-fadeIn">
        {/* 온보딩 진행 단계 */}
        <div className="flex items-center justify-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-1.5 text-slate-400">
            <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold border border-emerald-200">
              <Check className="w-3 h-3" />
            </div>
            <span>카카오 연동</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200" />
          <div className="flex items-center gap-1.5 text-[#2563EB] font-bold">
            <div className="w-5 h-5 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center text-xs font-bold border border-blue-200/55 animate-pulse">
              2
            </div>
            <span>가입정보 입력</span>
          </div>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900">크루 정보 입력</h2>
          </div>
          <p className="text-xs text-slate-500 mb-8 leading-relaxed">
            러닝 기록 인증 및 랭킹 산정을 위해 실명 정보를 정확히 기입해 주세요.<br />
            입력하신 정보를 바탕으로 크루 내 **가상 닉네임**이 자동 구성됩니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이름 입력 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block tracking-wider">
                이름 (실명)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  maxLength={10}
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#2563EB] focus:shadow-[0_0_10px_rgba(37,99,235,0.15)] rounded-xl px-4 text-sm outline-none text-slate-800 transition-all duration-200"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-4 top-4" />
              </div>
            </div>

            {/* 출생년도 선택 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block tracking-wider">
                출생년도
              </label>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#2563EB] focus:shadow-[0_0_10px_rgba(37,99,235,0.15)] rounded-xl px-4 text-sm outline-none transition-all duration-200 cursor-pointer appearance-none text-slate-800"
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
              <label className="text-xs font-bold text-slate-700 block tracking-wider">
                성별
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setGender('남')}
                  className={`h-12 rounded-xl border font-bold text-sm transition-all duration-300 flex items-center justify-center cursor-pointer ${
                    gender === '남'
                      ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350 hover:text-slate-800'
                  }`}
                >
                  남성
                </button>
                <button
                  type="button"
                  onClick={() => setGender('여')}
                  className={`h-12 rounded-xl border font-bold text-sm transition-all duration-300 flex items-center justify-center cursor-pointer ${
                    gender === '여'
                      ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350 hover:text-slate-800'
                  }`}
                >
                  여성
                </button>
              </div>
            </div>

            {/* 닉네임 미리보기 */}
            {realName && birthYear && gender && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1.5 animate-fadeIn">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                  자동 구성될 가상 닉네임
                </span>
                <span className="text-lg font-black text-[#2563EB] tracking-wide">
                  {realName}/{birthYear.slice(-2)}/{gender}
                </span>
              </div>
            )}

            {/* 에러 출력 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl text-center font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={pending}
              className={`w-full h-14 font-extrabold text-sm tracking-wide rounded-2xl transition-all duration-300 shadow-sm cursor-pointer flex items-center justify-center ${
                pending
                  ? 'bg-slate-200 text-slate-400'
                  : 'bg-[#2563EB] text-white hover:bg-[#2563EB]/95 active:scale-[0.98]'
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
