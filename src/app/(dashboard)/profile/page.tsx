'use client'

import { useState, useEffect } from 'react'
import { mockStore, Profile, RunningRecord, MarathonPB } from '@/lib/mockStore'
import { Sparkles, Trophy, Calendar, MapPin, Trash2, ShieldAlert, Award, Footprints, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myRecords, setMyRecords] = useState<RunningRecord[]>([])

  const handleSignOut = () => {
    if (confirm('로그아웃 하시겠습니까? 세션이 초기화되고 로그인 화면으로 이동합니다.')) {
      localStorage.removeItem('src_is_logged_in')
      window.location.href = '/login'
    }
  }
  
  // PB 시간 입력값 상태
  const [pb10k, setPb10k] = useState('')
  const [pbHalf, setPbHalf] = useState('')
  const [pbFull, setPbFull] = useState('')

  // 피드백 알림 상태
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const activeProfile = mockStore.getProfile()
    const activeRecords = mockStore.getRunningRecords()
    const activePBs = mockStore.getMarathonPBs()

    // 내 글만 필터링
    const filteredMyRecords = activeRecords.filter(rec => rec.user_id === activeProfile.id)
    
    setProfile(activeProfile)
    setMyRecords(filteredMyRecords)

    // 각 종목별 기존 PB 바인딩
    const pbMap = activePBs.reduce((acc, pb) => ({ ...acc, [pb.category]: pb.record_time }), {} as Record<string, string>)
    setPb10k(pbMap['10K'] || '')
    setPbHalf(pbMap['Half'] || '')
    setPbFull(pbMap['Full'] || '')
  }

  // HH:MM:SS 포맷 정규식 유효성 검사 (시분초 유효성)
  const validateTimeFormat = (timeStr: string) => {
    if (!timeStr) return true // 빈 값 허용 (기록 삭제/없음)
    const timeRegex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/
    return timeRegex.test(timeStr)
  }

  const handleSavePBs = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    // 1. 유효성 검증
    if (!validateTimeFormat(pb10k) || !validateTimeFormat(pbHalf) || !validateTimeFormat(pbFull)) {
      setErrorMsg('기록 시간 포맷은 반드시 HH:MM:SS (시:분:초) 양식으로 입력해야 합니다. (예: 00:45:30)')
      return
    }

    try {
      // 2. 스토어 저장
      if (pb10k) mockStore.saveMarathonPB('10K', pb10k)
      if (pbHalf) mockStore.saveMarathonPB('Half', pbHalf)
      if (pbFull) mockStore.saveMarathonPB('Full', pbFull)

      setSuccessMsg('마라톤 3대 최고 기록(PB)이 안전하게 저장되었습니다! PB 보드 랭킹이 즉시 갱신되었습니다. 🏆')
      setTimeout(() => setSuccessMsg(null), 3000)
      loadData()
    } catch {
      setErrorMsg('기록 업데이트 중 오류가 발생했습니다.')
    }
  }

  // 러닝 인증 기록 삭제 핸들러
  const handleDeleteRecord = (id: string) => {
    if (confirm('이 러닝 인증 기록을 정말 삭제하시겠습니까?')) {
      mockStore.deleteRunningRecord(id)
      loadData()
    }
  }

  if (!profile) return null

  // 이번 달 누적 거리 및 출석일 통계 연산
  const totalDistance = myRecords.reduce((acc, rec) => acc + rec.distance, 0)
  const uniqueDates = Array.from(new Set(myRecords.map(rec => rec.date))).length

  const roleLabels: Record<string, string> = {
    WAITING: '대기회원 ⏳',
    REGULAR: '정회원 🔥',
    PACER: '크루 페이서 🎈',
    ADMIN: '크루 운영자 ⚡',
  }

  return (
    <div className="p-5 flex flex-col min-h-screen select-none">
      
      {/* 타이틀 헤더 */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h1 className="text-lg font-black tracking-wide text-white">마이페이지</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">My Profile & PBs</p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </header>

      {/* 1. 프로필 서머리 카드 */}
      <section className="bg-slate-900/50 border border-slate-850 rounded-3xl p-5 mb-6 shadow-md flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover border-2 border-[#D4FF3F]/30 shadow-lg"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-lg">
            👤
          </div>
        )}

        <div className="flex flex-col gap-1 flex-1">
          <span className="text-sm font-black text-white">{profile.nickname}</span>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {/* 권한 뱃지 */}
            <span className="text-[9px] font-black tracking-wider bg-slate-950/60 border border-slate-850 px-2.5 py-0.5 rounded-full text-slate-350">
              {roleLabels[profile.role] || '정회원'}
            </span>
            {/* 면제 뱃지 */}
            {profile.is_exempted && (
              <span className="text-[9px] font-black tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                🩹 부상 면제
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 2. 이번 달 누적 활동 통계 피드 */}
      <section className="grid grid-cols-2 gap-4 mb-6 select-none">
        <div className="bg-[#1E293B]/40 border border-slate-850 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D4FF3F]/10 text-[#D4FF3F] flex items-center justify-center shrink-0">
            <Footprints className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">이달의 누적 거리</span>
            <span className="text-sm font-black text-white">{totalDistance.toFixed(1)} km</span>
          </div>
        </div>
        <div className="bg-[#1E293B]/40 border border-slate-850 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">이달의 출석 일수</span>
            <span className="text-sm font-black text-white">{uniqueDates} 일</span>
          </div>
        </div>
      </section>

      {/* 3. 마라톤 3대 최고 기록 (PB) 설정 관리 폼 */}
      <section className="bg-slate-900/50 border border-slate-850 rounded-3xl p-5 mb-6 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-[#D4FF3F]" />
          <h2 className="text-xs font-black text-white uppercase tracking-wider">나의 마라톤 PB 기록 등록</h2>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
          공식 대회 최고 기록을 시:분:초(`HH:MM:SS`) 형태로 기입해 주세요.<br />
          예: **46분 15초** ➔ `00:46:15` | **3시간 45분 0초** ➔ `03:45:00`
        </p>

        <form onSubmit={handleSavePBs} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* 10K 기록 */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider block text-center">10K</label>
              <input
                type="text"
                placeholder="00:45:30"
                maxLength={8}
                value={pb10k}
                onChange={(e) => setPb10k(e.target.value)}
                className="w-full h-10 bg-slate-950/60 border border-slate-850 focus:border-[#D4FF3F] rounded-xl px-2 text-center text-xs outline-none text-white font-extrabold transition-all"
              />
            </div>
            {/* Half 기록 */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider block text-center">Half (21k)</label>
              <input
                type="text"
                placeholder="01:45:00"
                maxLength={8}
                value={pbHalf}
                onChange={(e) => setPbHalf(e.target.value)}
                className="w-full h-10 bg-slate-950/60 border border-slate-850 focus:border-[#D4FF3F] rounded-xl px-2 text-center text-xs outline-none text-white font-extrabold transition-all"
              />
            </div>
            {/* Full 기록 */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider block text-center">Full (42k)</label>
              <input
                type="text"
                placeholder="03:59:59"
                maxLength={8}
                value={pbFull}
                onChange={(e) => setPbFull(e.target.value)}
                className="w-full h-10 bg-slate-950/60 border border-slate-850 focus:border-[#D4FF3F] rounded-xl px-2 text-center text-xs outline-none text-white font-extrabold transition-all"
              />
            </div>
          </div>

          {/* 에러/성공 토스트 */}
          {errorMsg && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-xl text-center font-bold animate-scaleUp">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-[#D4FF3F]/10 border border-[#D4FF3F]/20 text-[#D4FF3F] text-[10px] rounded-xl text-center font-bold animate-scaleUp">
              ✓ {successMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-11 bg-[#D4FF3F] text-[#0B0F19] hover:bg-[#D4FF3F]/90 font-extrabold text-xs tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center"
          >
            기록 저장 및 랭킹 반영
          </button>
        </form>
      </section>

      {/* 4. 내 기록 리스트 히스토리 피드 */}
      <section className="flex-1 flex flex-col select-none">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-slate-500 tracking-wider font-bold uppercase">내 러닝 활동 기록</span>
          <span className="text-[10px] text-slate-450 font-bold">{myRecords.length}회</span>
        </div>

        {myRecords.length === 0 ? (
          <div className="flex-1 min-h-[160px] bg-slate-900/25 border border-slate-850/60 rounded-3xl flex flex-col items-center justify-center p-6 text-slate-500 text-center">
            <span>📪 이번 달 등록하신 내 활동 이력이 없습니다.</span>
            <span className="text-[10px] text-slate-650 mt-1">대시보드의 인증버튼을 클릭해 기록을 보완해 보세요!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {myRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-[#151D30]/60 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-fadeIn"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/50 flex items-center justify-center text-xs shrink-0">
                    {rec.type === 'REGULAR' ? '👥' : '🏃'}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">{rec.distance.toFixed(1)} km</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${
                        rec.type === 'REGULAR'
                          ? 'bg-[#D4FF3F]/10 text-[#D4FF3F] border-[#D4FF3F]/20'
                          : 'bg-slate-800 text-slate-400 border-slate-750'
                      }`}>
                        {rec.type === 'REGULAR' ? '정기 벙' : '개인런'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[9px] text-slate-550">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-[#D4FF3F]/75" />
                        {rec.location_name}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {rec.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 기록 삭제 */}
                <button
                  onClick={() => handleDeleteRecord(rec.id)}
                  className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title="인증 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
