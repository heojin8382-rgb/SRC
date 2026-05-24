"use client";
import { useState, useEffect } from 'react'
import { mockStore, Profile, RunningRecord } from '@/lib/mockStore'
import { createClient } from '@/lib/supabase/client'
import { calculateMonthlySurvival, SurvivalStatus } from '@/lib/utils/survival'
import { Flame, Trophy, PlusCircle, CheckCircle2, AlertTriangle, Trash2, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [records, setRecords] = useState<RunningRecord[]>([])
  const [survival, setSurvival] = useState<SurvivalStatus | null>(null)
  const [isMock, setIsMock] = useState(false)

  // 컴포넌트 마운트 시 로컬 스토리지 또는 Supabase로부터 실시간 동적 바인딩
  useEffect(() => {
    const mockCheck = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url'
    setIsMock(mockCheck)
    loadData(mockCheck)
  }, [])

  const loadData = async (mockCheck?: boolean) => {
    const activeIsMock = mockCheck !== undefined ? mockCheck : isMock
    
    if (activeIsMock) {
      const activeProfile = mockStore.getProfile()
      const activeRecords = mockStore.getRunningRecords()
      
      // 내 기록만 필터링하여 생존 조건 연산 수행
      const myRecords = activeRecords.filter(rec => rec.user_id === activeProfile.id)
      const survivalCalc = calculateMonthlySurvival(myRecords, activeProfile.is_exempted, '2026-05')

      setProfile(activeProfile)
      setRecords(activeRecords)
      setSurvival(survivalCalc)
    } else {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: activeProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (!activeProfile) return

      const { data: dbRecords } = await supabase
        .from('running_records')
        .select('*, profiles(nickname, avatar_url)')
        .order('date', { ascending: false })

      const formattedRecords = (dbRecords || []).map((rec: any) => ({
        id: rec.id,
        user_id: rec.user_id,
        user_nickname: rec.profiles?.nickname || '신규 크루원',
        user_avatar: rec.profiles?.avatar_url || '',
        distance: Number(rec.distance),
        location_id: rec.location_id || '',
        location_name: rec.location_name,
        date: rec.date,
        type: rec.type,
        is_pacer: rec.is_pacer
      }))

      const myRecords = formattedRecords.filter(rec => rec.user_id === activeProfile.id)
      const survivalCalc = calculateMonthlySurvival(myRecords, activeProfile.is_exempted, '2026-05')

      setProfile(activeProfile as Profile)
      setRecords(formattedRecords)
      setSurvival(survivalCalc)
    }
  }

  // 내 기록 삭제 핸들러 (실시간 연동 체감용)
  const handleDeleteRecord = async (id: string) => {
    if (confirm('인증 기록을 삭제하시겠습니까? 이번 달 생존 게이지가 즉시 재계산됩니다.')) {
      if (isMock) {
        mockStore.deleteRunningRecord(id)
        loadData()
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('running_records')
          .delete()
          .eq('id', id)
        if (error) {
          alert('기록 삭제에 실패했습니다.')
        } else {
          loadData()
        }
      }
    }
  }

  if (!profile || !survival) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="text-xs text-slate-400 animate-pulse">대시보드 구성 중...</span>
      </div>
    )
  }

  // 역할군 배지 매핑
  const roleBadges: Record<string, { label: string; style: string; emoji: string }> = {
    WAITING: { label: '대기회원', style: 'bg-slate-100 text-slate-500 border-slate-200', emoji: '⏳' },
    REGULAR: { label: '정회원', style: 'bg-emerald-50 text-emerald-600 border-emerald-100', emoji: '🔥' },
    PACER: { label: '페이서', style: 'bg-amber-50 text-amber-600 border-amber-100', emoji: '🎈' },
    ADMIN: { label: '운영자', style: 'bg-blue-50 text-blue-600 border-blue-100 shadow-[0_0_10px_rgba(37,99,235,0.05)]', emoji: '⚡' },
  }

  const currentRoleBadge = roleBadges[profile.role] || roleBadges.REGULAR

  // 게이지 바 퍼센트 계산 (조건 B인 6일을 분모로 활용하여 최적의 진척도 연출)
  const progressPercent = Math.min(100, Math.round((survival.totalDays / 6) * 100))
  
  // SVG 써클 연산 (반지름 32, 둘레 201)
  const radius = 32
  const circumference = 2 * Math.PI * radius // 약 201
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100

  return (
    <div className="p-5 flex flex-col relative select-none">
      {/* 1. 상단 사용자 프로필 헤더 */}
      <header className="flex items-center justify-between mb-6 z-10 relative">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full blur-[2px] opacity-60 group-hover:opacity-100 transition duration-300" />
              <img
                src={profile.avatar_url}
                alt="My Avatar"
                className="relative w-11 h-11 rounded-full object-cover border border-slate-200"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm shadow-inner">
              🏃
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-400 font-extrabold tracking-widest uppercase">SRC RUNNER</span>
            <span className="text-sm font-black tracking-tight text-slate-800 mt-0.5 font-bold">
              {profile.nickname}
            </span>
          </div>
        </div>

        {profile.role === 'ADMIN' && (
          <Link
            href="/admin"
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
            title="관리자 설정"
          >
            ⚙️
          </Link>
        )}
      </header>

      {/* 2. 월간 생존(활동) 카운터 & 게이지 보드 (유리 효과 카드) */}
      <div className={survival.survived ? 'glowing-survived-card-wrapper mb-6' : 'mb-6'}>
        <section className={`bg-white/85 rounded-3xl p-5 shadow-[0_8px_30px_rgba(15,23,42,0.03)] relative overflow-hidden select-none z-10 animate-fadeIn ${
          survival.survived ? 'border-transparent' : 'border border-slate-200/60'
        }`}>
        {/* 그라데이션 발광 장식 */}
        <div className="absolute top-[-30%] right-[-10%] w-[120px] h-[120px] bg-blue-500/5 rounded-full blur-[40px] pointer-events-none" />
        
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm">
              <Flame className={`w-4.5 h-4.5 ${survival.survived ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 font-extrabold tracking-widest uppercase">Survival Status</span>
              <h2 className="text-xs font-black tracking-wide text-slate-800">5월 생존 리포트</h2>
            </div>
          </div>
          {/* 생존 최종 결과 배지 */}
          <span className={`text-[8px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border transition-all duration-350 ${
            survival.survived
              ? 'bg-blue-50 text-blue-650 border-blue-200 shadow-sm'
              : survival.totalDays === 0
              ? 'bg-rose-50 text-rose-600 border-rose-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {survival.statusMessage}
          </span>
        </div>

        {/* 생존 진행 상황 분석 수치 */}
        {survival.exempted ? (
          <div className="py-4 text-center text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-2xl border border-slate-200/60 p-4">
            🩹 <strong className="text-blue-600 font-extrabold">부상 면제 회원</strong>으로 등록되어 있습니다.<br />
            활동 기록에 구애받지 않고 자동으로 이번 달 생존자로 분류됩니다. 쾌차를 빕니다!
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              {/* 왼쪽: 세부 수치 */}
              <div className="flex-1 space-y-2">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">인증 현황</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50/80 border border-slate-200/50 p-3 rounded-2xl flex flex-col gap-0.5 shadow-sm">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">정기 벙</span>
                    <span className="text-sm font-black text-slate-800">{survival.regularDays}회</span>
                  </div>
                  <div className="bg-slate-50/80 border border-slate-200/50 p-3 rounded-2xl flex flex-col gap-0.5 shadow-sm">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">개인런</span>
                    <span className="text-sm font-black text-slate-800">{survival.personalDays}회</span>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 아름다운 SVG 써클 게이지 */}
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  {/* 뒷배경 서클 */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    className="stroke-slate-100"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  {/* 네온 글로우용 레이어 */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="7"
                    strokeDasharray={201}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="opacity-15 blur-[2px] transition-all duration-1000 ease-out"
                  />
                  {/* 전경 그라데이션 게이지 */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="5"
                    strokeDasharray={201}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* 게이지 중앙 텍스트 */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-slate-800 tracking-tight">{survival.totalDays}일</span>
                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">목표 6일</span>
                </div>
              </div>
            </div>

            {/* 가이드 메시지 분기 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col gap-1.5 shadow-sm">
              {survival.survived ? (
                <div className="flex gap-2 items-start text-[10px] text-blue-600">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 animate-pulse" />
                  <span className="leading-relaxed font-bold">
                    <strong className="text-slate-800 font-black">축하합니다!</strong> 이달의 생존 요건을 모두 충족하셨습니다. 다음 달에도 부상 없이 즐겁게 달려봅시다!
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-[10px] text-slate-500">
                  <div className="flex gap-1.5 items-center text-amber-600 font-black tracking-wider uppercase text-[9px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>생존 미션 달성 조건 (택 1):</span>
                  </div>
                  <ul className="space-y-1.5 pl-0.5">
                    <li className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-blue-500 mt-1 shrink-0">•</span>
                      <span>
                        <span className="text-slate-700 font-extrabold">조건 A (정기런 위주):</span> 앞으로{' '}
                        <strong className="text-blue-600 font-black">정기런 {survival.remainingRegularForA}회</strong> +{' '}
                        <strong className="text-slate-800 font-black">아무 러닝 {survival.remainingTotalForA}회</strong> 추가 인증
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-blue-500 mt-1 shrink-0">•</span>
                      <span>
                        <span className="text-slate-700 font-extrabold">조건 B (개인런 위주):</span> 앞으로{' '}
                        <strong className="text-blue-600 font-black">아무 러닝 {survival.remainingTotalForB}회</strong> 추가 인증
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      </div>

      {/* 3. 퀵 메뉴 그리드 (고품질 테두리 & 입체감) */}
      <section className="grid grid-cols-2 gap-4 mb-6 z-10 relative">
        <Link
          href="/record"
          className="bg-white border border-slate-200/80 hover:border-blue-300 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group shadow-sm hover:-translate-y-0.5"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-100 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all duration-300">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-black tracking-wide text-slate-800 mt-1">러닝 기록 인증</span>
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">최소 3km 이상 등록</span>
        </Link>
        
        <Link
          href="/members"
          className="bg-white border border-slate-200/80 hover:border-amber-300 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group shadow-sm hover:-translate-y-0.5"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-100 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300">
            <Trophy className="w-5 h-5" />
          </div>
          <span className="text-xs font-black tracking-wide text-slate-800 mt-1">크루원 PB 보드</span>
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">마라톤 3대 기록 경쟁</span>
        </Link>
      </section>

      {/* 4. 실시간 크루 인증 피드 */}
      <section className="flex-1 flex flex-col select-none z-10 relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase">
            실시간 크루 인증 피드
          </span>
          <span className="text-[8px] text-blue-650 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full font-black tracking-wider">
            5월 총 {records.length}개
          </span>
        </div>

        {records.length === 0 ? (
          <div className="flex-1 min-h-[180px] bg-slate-50 border border-slate-200/60 rounded-3xl flex flex-col items-center justify-center p-6 text-slate-400 text-center">
            <span className="text-xs font-bold text-slate-500">📪 이번 달 등록된 러닝 기록이 없습니다.</span>
            <span className="text-[8px] text-slate-400 mt-1.5 uppercase font-black tracking-widest">Start the first run today</span>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => {
              const isMine = rec.user_id === profile.id

              return (
                <div
                  key={rec.id}
                  className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    {/* 크루원 아바타 */}
                    {rec.user_avatar ? (
                      <div className="relative shrink-0">
                        {rec.is_pacer && (
                          <div className="absolute -inset-0.5 bg-amber-550/40 rounded-full blur-[1px]" />
                        )}
                        <img
                          src={rec.user_avatar}
                          alt="Avatar"
                          className="relative w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs shrink-0 shadow-inner">
                        🏃
                      </div>
                    )}

                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800">{rec.user_nickname}</span>
                        {/* 타입 배지 */}
                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border tracking-wide ${
                          rec.type === 'REGULAR'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {rec.type === 'REGULAR' ? '정기 벙' : '개인런'}
                        </span>
                        {/* 페이서 배지 */}
                        {rec.is_pacer && (
                          <span className="text-[9px]" title="페이서로 활약 🎈">
                            🎈
                          </span>
                        )}
                      </div>
                      
                      {/* 러닝 상세 메타 */}
                      <div className="flex items-center gap-2.5 text-[8px] text-slate-400 font-extrabold tracking-wider">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-slate-350" />
                          {rec.location_name}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3 text-slate-350" />
                          {rec.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 기록 수치 및 삭제 액션 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-650 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-xl tracking-tight">
                      {rec.distance.toFixed(1)} <span className="text-[8px] text-slate-400 font-bold uppercase">km</span>
                    </span>

                    {/* 본인 글 삭제 토글 */}
                    {isMine && (
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                        title="기록 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
