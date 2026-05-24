'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mockStore, Profile, Location } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { createClient } from '@/lib/supabase/client'
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
    const loadInitialData = async () => {
      const isMock = checkIsMock()
      let activeProfile: Profile | null = null
      let activeLocations: Location[] = []

      if (isMock) {
        activeProfile = mockStore.getProfile()
        activeLocations = mockStore.getLocations().filter(loc => loc.is_active)
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          activeProfile = profileData as Profile
        }
        const { data: locationData } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
        activeLocations = locationData as Location[]
      }

      if (!activeProfile) return

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
    }

    loadInitialData()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const isMock = checkIsMock()
    if (isMock) {
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
    } else {
      try {
        const supabase = createClient()
        const { error: dbError } = await supabase
          .from('running_records')
          .insert([{
            user_id: profile.id,
            distance: finalDistance,
            location_id: selectedLoc.id,
            location_name: selectedLoc.name,
            date: date,
            type: type,
            is_pacer: type === 'REGULAR' ? isPacer : false
          }])
        if (dbError) throw dbError

        setPending(false)
        setSuccess(true)

        // 대시보드로 이동
        setTimeout(() => {
          router.push('/')
        }, 1000)
      } catch (err: any) {
        setPending(false)
        setError(err.message || '인증 기록 등록에 실패했습니다.')
      }
    }
  }

  if (!profile) return null

  return (
    <div className="p-6 flex flex-col relative select-none">
      {/* 뒤로가기 헤더 */}
      <header className="flex items-center gap-4 mb-6 z-10 relative">
        <Link
          href="/"
          className="p-2 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all duration-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-extrabold tracking-widest uppercase">CERTIFICATE</span>
          <h1 className="text-base font-black tracking-tight text-slate-800 mt-0.5">러닝 기록 인증</h1>
        </div>
      </header>

      {/* 등록 카드 */}
      <div className="bg-white/85 border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgba(15,23,42,0.03)] z-10 relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">기록 제출 폼</h2>
        </div>
        <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">
          오늘 달리신 러닝 상세 데이터를 제출해 주세요.<br />
          제출 즉시 <strong className="text-slate-800 font-bold">월간 생존 알고리즘</strong>이 작동되어 반영됩니다.
        </p>

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 text-center animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-2xl font-black shadow-sm animate-bounceIn">
              ✓
            </div>
            <h3 className="text-base font-black text-slate-800">인증 기록 등록 성공!</h3>
            <p className="text-[11px] text-slate-455">대시보드로 복귀 중입니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. 거리 입력 */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">
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
                  className="w-full h-12 bg-slate-50 border border-slate-200/80 focus:border-blue-500 focus:shadow-[0_0_12px_rgba(37,99,235,0.06)] rounded-xl px-4 pr-12 text-sm outline-none text-slate-800 font-extrabold tracking-wide transition-all"
                />
                <span className="text-[10px] font-black text-blue-600 absolute right-4 top-4 tracking-wider">
                  KM
                </span>
              </div>
            </div>

            {/* 2. 장소 선택 */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">
                러닝 장소
              </label>
              <div className="relative">
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-200/80 focus:border-blue-500 focus:shadow-[0_0_12px_rgba(37,99,235,0.06)] rounded-xl px-4 text-sm outline-none text-slate-700 cursor-pointer appearance-none font-bold"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-white text-slate-850">
                      📍 {loc.name}
                    </option>
                  ))}
                </select>
                <Navigation className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
              </div>
            </div>

            {/* 3. 러닝 날짜 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">
                  러닝 날짜
                </label>
                {profile.role === 'ADMIN' ? (
                  <span className="text-[8px] font-black text-blue-600 tracking-wider bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                    ⚡ ADMIN 무제한 소급
                  </span>
                ) : (
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                    최근 30일 이내
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
                  className="w-full h-12 bg-slate-50 border border-slate-200/80 focus:border-blue-500 focus:shadow-[0_0_12px_rgba(37,99,235,0.06)] rounded-xl px-4 pr-12 text-sm outline-none text-slate-700 font-bold transition-all appearance-none"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
              </div>
            </div>

            {/* 4. 러닝 타입 */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">
                러닝 구분 (타입)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setType('PERSONAL'); setIsPacer(false); }}
                  className={`h-12 rounded-xl border font-black text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'PERSONAL'
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.06)]'
                      : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600'
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
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.06)]'
                      : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  👥
                  정기 벙 러닝
                </button>
              </div>
            </div>

            {/* 5. 정기 벙 선택 시 페이서 토글 활성화 */}
            {type === 'REGULAR' && (
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between animate-fadeIn shadow-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                    🎈 페이서(Pacer) 가동 여부
                  </span>
                  <span className="text-[9px] text-slate-500">
                    해당 벙 러닝에서 페이서 역할을 성공적으로 완수하셨나요?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPacer(!isPacer)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                    isPacer ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full shadow-sm bg-white transition-transform" />
                </button>
              </div>
            )}

            {/* 에러 피드백 */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2 font-bold justify-center animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={pending}
              className={`w-full h-14 font-extrabold text-sm tracking-wide rounded-2xl transition-all duration-300 shadow-sm cursor-pointer flex items-center justify-center ${
                pending
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-[0_4px_12px_rgba(37,99,235,0.15)]'
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
