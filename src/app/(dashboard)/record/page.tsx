'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mockStore, Profile, Location } from '@/lib/mockStore'
import { Sparkles, Calendar, Navigation, Route, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RecordPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  
  // 폼 입력 상태값
  const [distance, setDistance] = useState('')
  const [locationId, setLocationId] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'PERSONAL' | 'REGULAR'>('PERSONAL')
  const [isPacer, setIsPacer] = useState(false)

  // 검증 및 통신 상태값
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  // 날짜 선택 범위 제약용
  const [minDate, setMinDate] = useState('')
  const [maxDate, setMaxDate] = useState('')

  useEffect(() => {
    const activeProfile = mockStore.getProfile()
    const activeLocations = mockStore.getLocations().filter(loc => loc.is_active) // 활성 장소만 필터링

    setProfile(activeProfile)
    setLocations(activeLocations)

    if (activeLocations.length > 0) {
      setLocationId(activeLocations[0].id)
    }

    // 날짜 피커 제한 제약 설정 (오늘을 최댓값으로 지정하여 미래 선택 방지)
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`
    setMaxDate(todayStr)
    setDate(todayStr) // 기본값을 오늘 날짜로 바인딩

    // 역할군별 과거 소급 제한 조건 연산
    if (activeProfile.role !== 'ADMIN') {
      // 일반 회원은 최근 30일 이내만 소급 가능
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 30)
      const min_yyyy = thirtyDaysAgo.getFullYear()
      const min_mm = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')
      const min_dd = String(thirtyDaysAgo.getDate()).padStart(2, '0')
      setMinDate(`${min_yyyy}-${min_mm}-${min_dd}`)
    } else {
      // ADMIN은 무기한 소급 가능 (달력 하한선 없음)
      setMinDate('1970-01-01')
    }
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!profile) return

    // 1. 거리 제한 검증 (최소 3.0km)
    const distNum = parseFloat(distance)
    if (isNaN(distNum) || distNum < 3.0) {
      setError('러닝 거리는 최소 3.0km 이상 등록해 주세요. 🏃‍♂️')
      return
    }

    // 2. 장소 검증
    const selectedLoc = locations.find(loc => loc.id === locationId)
    if (!selectedLoc) {
      setError('올바른 러닝 장소를 선택해 주세요.')
      return
    }

    // 3. 날짜 검증
    if (!date) {
      setError('러닝 날짜를 정확히 선택해 주세요.')
      return
    }

    if (date > maxDate) {
      setError('미래의 날짜는 등록할 수 없습니다.')
      return
    }

    if (profile.role !== 'ADMIN' && minDate && date < minDate) {
      setError('일반 회원은 최근 30일 이내의 날짜까지만 소급 등록할 수 있습니다. 30일 이전 소급은 어드민에게 문의하세요.')
      return
    }

    setPending(true)

    // 소수점 첫째짜리로 라운딩 처리
    const finalDistance = Math.round(distNum * 10) / 10

    setTimeout(() => {
      // mockStore에 기록 삽입
      mockStore.addRunningRecord({
        distance: finalDistance,
        location_id: selectedLoc.id,
        location_name: selectedLoc.name,
        date: date,
        type: type,
        is_pacer: type === 'REGULAR' ? isPacer : false
      })

      setPending(false)
      setSuccess(true)

      // 대시보드로 이동
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }, 800)
  }

  if (!profile) return null

  return (
    <div className="p-6 flex flex-col min-h-screen select-none">
      {/* 뒤로가기 헤더 */}
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-black tracking-wide text-white">러닝 기록 인증</h1>
      </header>

      {/* 등록 카드 */}
      <div className="bg-[#1E293B]/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#D4FF3F]" />
          <h2 className="text-sm font-black text-white uppercase tracking-wider">기록 제출 폼</h2>
        </div>
        <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">
          오늘 달리신 러닝 상세 데이터를 제출해 주세요.<br />
          제출 즉시 **월간 생존 알고리즘**이 구동되어 대시보드 현황판에 연계 반영됩니다.
        </p>

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 text-center animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-[#D4FF3F]/10 border border-[#D4FF3F]/35 flex items-center justify-center text-[#D4FF3F]">
              ✓
            </div>
            <h3 className="text-base font-black text-white">인증 기록 등록 성공!</h3>
            <p className="text-xs text-slate-400">대시보드로 복귀 중입니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. 거리 입력 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 tracking-wide block">
                러닝 거리 (km)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="3.0"
                  max="100.0"
                  required
                  placeholder="최소 3.0km 이상 입력"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full h-12 bg-slate-950/60 border border-slate-850 focus:border-[#D4FF3F] focus:shadow-[0_0_10px_rgba(212,255,63,0.15)] rounded-xl px-4 pr-12 text-sm outline-none text-white font-extrabold tracking-wide transition-all"
                />
                <span className="text-xs font-black text-slate-500 absolute right-4 top-3.5">
                  KM
                </span>
              </div>
            </div>

            {/* 2. 장소 선택 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 tracking-wide block">
                러닝 장소
              </label>
              <div className="relative">
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full h-12 bg-slate-950/60 border border-slate-850 focus:border-[#D4FF3F] focus:shadow-[0_0_10px_rgba(212,255,63,0.15)] rounded-xl px-4 text-sm outline-none text-slate-350 cursor-pointer appearance-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.name}
                    </option>
                  ))}
                </select>
                <Navigation className="w-4 h-4 text-slate-500 absolute right-4 top-4 pointer-events-none" />
              </div>
            </div>

            {/* 3. 러닝 날짜 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-400 tracking-wide block">
                  러닝 날짜
                </label>
                {profile.role === 'ADMIN' ? (
                  <span className="text-[9px] font-black text-[#D4FF3F] tracking-wide bg-[#D4FF3F]/10 border border-[#D4FF3F]/20 px-2 py-0.2 rounded-full">
                    ⚡ 어드민 무제한 소급 활성
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500">
                    최근 30일 이내만 선택 가능
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={minDate}
                  max={maxDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-12 bg-slate-950/60 border border-slate-850 focus:border-[#D4FF3F] focus:shadow-[0_0_10px_rgba(212,255,63,0.15)] rounded-xl px-4 pr-12 text-sm outline-none text-slate-300 font-bold transition-all appearance-none"
                />
                <Calendar className="w-4 h-4 text-slate-500 absolute right-4 top-4 pointer-events-none" />
              </div>
            </div>

            {/* 4. 러닝 타입 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 tracking-wide block">
                러닝 구분 (타입)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setType('PERSONAL'); setIsPacer(false); }}
                  className={`h-12 rounded-xl border font-black text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'PERSONAL'
                      ? 'border-[#D4FF3F] bg-[#D4FF3F]/10 text-[#D4FF3F] shadow-[0_0_10px_rgba(212,255,63,0.15)]'
                      : 'border-slate-850 bg-slate-950/40 text-slate-450 hover:border-slate-700 hover:text-slate-350'
                  }`}
                >
                  <Route className="w-3.5 h-3.5" />
                  개인런
                </button>
                <button
                  type="button"
                  onClick={() => setType('REGULAR')}
                  className={`h-12 rounded-xl border font-black text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'REGULAR'
                      ? 'border-[#D4FF3F] bg-[#D4FF3F]/10 text-[#D4FF3F] shadow-[0_0_10px_rgba(212,255,63,0.15)]'
                      : 'border-slate-850 bg-slate-950/40 text-slate-450 hover:border-slate-700 hover:text-slate-350'
                  }`}
                >
                  👥
                  정기 벙 러닝
                </button>
              </div>
            </div>

            {/* 5. 정기 벙 선택 시 페이서 토글 활성화 */}
            {type === 'REGULAR' && (
              <div className="p-4 bg-slate-950/40 border border-slate-850/60 rounded-2xl flex items-center justify-between animate-scaleUp">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-black text-white flex items-center gap-1">
                    🎈 페이서(Pacer) 가동 여부
                  </span>
                  <span className="text-[9px] text-slate-500">
                    해당 벙 러닝에서 페이서 역할을 성공적으로 완수하셨나요?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPacer(!isPacer)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors cursor-pointer flex ${
                    isPacer ? 'bg-[#D4FF3F] justify-end' : 'bg-slate-850 justify-start'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full shadow-md transition-transform ${isPacer ? 'bg-[#0B0F19]' : 'bg-slate-400'}`} />
                </button>
              </div>
            )}

            {/* 에러 피드백 */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2 font-bold justify-center animate-scaleUp">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
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
              {pending ? '러닝 인증서 저장 중...' : '러닝 기록 등록하기'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
