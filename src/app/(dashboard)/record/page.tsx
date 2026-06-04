'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mockStore, Profile, Location } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Calendar, Navigation, Route, AlertTriangle, ArrowLeft, Camera, UploadCloud, Check } from 'lucide-react'
import Link from 'next/link'
import { parseGpxFile } from '@/lib/utils/gpx'

export default function RecordPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  
  // GPX 상태값
  const [gpxFileName, setGpxFileName] = useState('')
  const [gpxParsedMessage, setGpxParsedMessage] = useState('')

  // 폼 입력 상태값
  const [distance, setDistance] = useState('')
  const [locationId, setLocationId] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'PERSONAL' | 'REGULAR'>('PERSONAL')
  const [isPacer, setIsPacer] = useState(false)
  const [proofImageFile, setProofImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  // 검증 및 통신 상태값
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  // 날짜 선택 범위 제약용
  const [minDate, setMinDate] = useState('')
  const [maxDate, setMaxDate] = useState('')
  const [activeMission, setActiveMission] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('src_active_mission')
    if (saved) {
      try {
        setActiveMission(JSON.parse(saved))
      } catch (e) {}
    }

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

  const handleGpxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setGpxParsedMessage('')
    setGpxFileName('')

    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'gpx') {
      setError('올바른 GPX 확장자 파일(.gpx)을 업로드해 주세요.')
      return
    }

    setGpxFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) {
        setError('GPX 파일을 읽어오는데 실패했습니다.')
        return
      }

      const result = parseGpxFile(text)
      if (result.error) {
        setError(result.error)
        setGpxFileName('')
      } else {
        setDistance(String(result.distance))
        setDate(result.date)
        setGpxParsedMessage(`GPX 파싱 완료: ${result.distance}km, ${result.date} 자동 입력되었습니다! ✨`)
      }
    }

    reader.onerror = () => {
      setError('GPX 파일을 읽는 중 오류가 발생했습니다.')
      setGpxFileName('')
    }

    reader.readAsText(file)
  }

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
      const saveRecord = (imageUrl?: string) => {
        mockStore.addRunningRecord({
          distance: finalDistance,
          location_id: selectedLoc.id,
          location_name: selectedLoc.name,
          date: date,
          type: type,
          is_pacer: type === 'REGULAR' ? isPacer : false,
          proof_image_url: imageUrl || ''
        })

        setPending(false)
        setSuccess(true)

        // 대시보드로 이동
        setTimeout(() => {
          router.push('/')
        }, 1000)
      }

      if (proofImageFile) {
        const reader = new FileReader()
        reader.onloadend = () => {
          saveRecord(reader.result as string)
        }
        reader.readAsDataURL(proofImageFile)
      } else {
        saveRecord()
      }
    } else {
      try {
        const supabase = createClient()
        let uploadedUrl = ''

        if (proofImageFile) {
          const fileExt = proofImageFile.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `${profile.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('running-proofs')
            .upload(filePath, proofImageFile, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('running-proofs')
            .getPublicUrl(filePath)
          
          uploadedUrl = publicUrl
        }

        const { error: dbError } = await supabase
          .from('running_records')
          .insert([{
            user_id: profile.id,
            distance: finalDistance,
            location_id: selectedLoc.id,
            location_name: selectedLoc.name,
            date: date,
            type: type,
            is_pacer: type === 'REGULAR' ? isPacer : false,
            proof_image_url: uploadedUrl
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
    <div className="p-5 flex flex-col min-h-screen relative overflow-hidden select-none bg-white">
      {/* 뒤로가기 헤더 */}
      <header className="flex items-center gap-3 mb-5 z-10 relative">
        <Link
          href="/"
          className="p-1.5 hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-500 rounded-xl transition-all duration-300 cursor-pointer shadow-sm bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-base font-black tracking-tight text-slate-800">러닝 기록 인증</h1>
          <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">Submit Run Certificate</p>
        </div>
      </header>

      {/* 등록 카드 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm z-10 relative">
        {/* 활성 미션 알림 팁 */}
        {activeMission && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-250 rounded-2xl flex items-center justify-between text-[9px] text-slate-700 leading-relaxed font-bold animate-fadeIn">
            <div className="flex gap-2">
              <span className="text-sm">🎯</span>
              <div className="text-left">
                <span className="text-[8px] text-amber-600 uppercase tracking-widest block font-extrabold">도전 중인 러닝 미션</span>
                <span className="font-extrabold text-slate-800">{activeMission.title}</span>: {activeMission.text}
              </div>
            </div>
          </div>
        )}

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 text-center animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] text-xl font-black shadow-sm animate-bounceIn">
              ✓
            </div>
            <h3 className="text-sm font-black text-slate-800">인증 기록 등록 성공!</h3>
            <p className="text-[10px] text-slate-400">대시보드로 복귀 중입니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* GPX 자동 등록 영역 (가민, 스트라바) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/25 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div className="flex flex-col text-left justify-center min-w-0">
                  <span className="text-[10px] font-black text-slate-800 truncate">
                    {gpxFileName || 'GPX 파일 자동 가져오기'}
                  </span>
                  <span className="text-[8px] text-slate-500 truncate font-bold uppercase tracking-wider">
                    {gpxFileName ? '가져오기 완료' : '가민 / 스트라바 로그 연동'}
                  </span>
                </div>
              </div>
              
              <label className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-[9px] font-black tracking-widest uppercase rounded-xl transition-all cursor-pointer shadow-sm shrink-0">
                파일 선택
                <input
                  type="file"
                  accept=".gpx"
                  className="hidden"
                  onChange={handleGpxUpload}
                />
              </label>
            </div>

            {gpxParsedMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-[9px] rounded-xl flex items-center gap-2 font-bold animate-fadeIn">
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span className="text-left">{gpxParsedMessage}</span>
              </div>
            )}

            {/* 1. 러닝 거리 */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                러닝 거리
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="3.0"
                  max="100.0"
                  required
                  placeholder="최소 3.0km 이상"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#2563EB] focus:shadow-[0_0_8px_rgba(37,99,235,0.08)] rounded-xl px-3 pr-10 text-xs outline-none text-slate-900 font-extrabold transition-all"
                />
                <span className="text-[9px] font-black text-[#2563EB] absolute right-3.5 top-3.5 tracking-wider">
                  KM
                </span>
              </div>
            </div>

            {/* 2. 러닝 장소 */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                러닝 장소
              </label>
              <div className="relative">
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#2563EB] focus:shadow-[0_0_8px_rgba(37,99,235,0.08)] rounded-xl px-3 pr-10 text-xs outline-none text-slate-700 cursor-pointer appearance-none font-bold"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-white text-slate-850">
                      📍 {loc.name}
                    </option>
                  ))}
                </select>
                <Navigation className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* 3. 러닝 날짜 */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                  러닝 날짜
                </label>
                {profile.role === 'ADMIN' ? (
                  <span className="text-[8px] font-black text-[#2563EB] tracking-wider bg-blue-50 border border-blue-150 px-2 py-0.2 rounded-full">
                    부여권 (어드민) 소관
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
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#2563EB] focus:shadow-[0_0_8px_rgba(37,99,235,0.08)] rounded-xl px-3 pr-10 text-xs outline-none text-slate-700 font-bold transition-all appearance-none"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* 4. 러닝 구분 (타입) */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                러닝 구분 (타입)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setType('PERSONAL'); setIsPacer(false); }}
                  className={`h-11 rounded-xl border font-black text-[11px] tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'PERSONAL'
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  <Route className="w-3.5 h-3.5" />
                  개인런
                </button>
                <button
                  type="button"
                  onClick={() => setType('REGULAR')}
                  className={`h-11 rounded-xl border font-black text-[11px] tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'REGULAR'
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  👥 정기 벙 러닝
                </button>
              </div>
            </div>

            {/* 5. 정기 벙 선택 시 페이서 토글 활성화 */}
            {type === 'REGULAR' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between animate-fadeIn shadow-sm">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                    🎈 페이서(Pacer) 가동 여부
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold">
                    벙 러닝에서 페이서 역할을 완수하셨나요?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPacer(!isPacer)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${
                    isPacer ? 'bg-[#2563EB]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                      isPacer ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* 6. 러닝 인증샷 첨부 */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                러닝 기록 인증 사진 (선택)
              </label>
              
              {previewUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 p-2 flex flex-col items-center">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-40 object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProofImageFile(null)
                      setPreviewUrl('')
                    }}
                    className="mt-2 text-[9px] font-black text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100 cursor-pointer"
                  >
                    사진 삭제
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/20 rounded-2xl cursor-pointer transition-all duration-300">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-5 h-5 mb-1 text-slate-400" />
                    <p className="text-[9px] font-black tracking-wide">러닝 인증 캡처화면 또는 사진 업로드</p>
                    <p className="text-[7px] text-slate-400 mt-0.5 uppercase font-black tracking-widest">PNG, JPG (최대 5MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        if (file.size > 5 * 1024 * 1024) {
                          alert('사진 크기는 5MB 이하여야 합니다.')
                          return
                        }
                        setProofImageFile(file)
                        setPreviewUrl(URL.createObjectURL(file))
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* 에러 피드백 */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] rounded-xl flex items-center gap-1.5 font-bold justify-center animate-fadeIn">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={pending}
              className={`w-full h-12 font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-300 shadow-sm cursor-pointer flex items-center justify-center ${
                pending
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-[#2563EB] text-white hover:bg-[#2563EB]/95 active:scale-[0.98] shadow-md'
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
