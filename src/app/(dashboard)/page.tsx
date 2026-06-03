"use client";

import { useState, useEffect } from 'react'
import { mockStore, Profile, RunningRecord } from '@/lib/mockStore'
import { createClient } from '@/lib/supabase/client'
import { calculateMonthlySurvival, SurvivalStatus } from '@/lib/utils/survival'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { 
  Flame, 
  Trophy, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Calendar, 
  MapPin, 
  Heart, 
  MessageSquare, 
  Send, 
  Award,
  Sparkles,
  TrendingUp,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { getBadgesForUser } from '@/lib/utils/badges'
import { triggerReactionParticles } from '@/components/ui/ParticleContainer'

interface DBComment {
  id: string
  record_id: string
  user_id: string
  comment_text: string
  created_at: string
  profiles?: {
    nickname: string
    avatar_url: string
  }
}

interface DBLike {
  id: string
  record_id: string
  user_id: string
}

const RUNNING_TIPS = [
  { type: 'QUOTE', text: "러닝은 속도가 아니라 방향이다. 오늘도 당신의 페이스를 믿고 달리세요! 🏃‍♂️", author: "SRC 코치" },
  { type: 'JOKE', text: "러너의 가장 큰 거짓말: '오늘 진짜 천천히 조깅 페이스로 뛸게.' (실제 페이스 4:30) 😉", author: "어느 정회원" },
  { type: 'ADVICE', text: "부상은 열정의 과잉에서 옵니다. 주 1~2회는 푹 쉬어주는 것도 러닝의 중요한 일부입니다. 🩹", author: "건강 지킴이" },
  { type: 'QUOTE', text: "완벽한 날씨나 완벽한 기분은 결코 오지 않는다. 일단 신발 끈을 묶는 것부터 시작하세요. 👟", author: "명언 자판기" },
  { type: 'JOKE', text: "달리기를 시작하고 건강해졌는데, 지갑은 가벼워졌습니다. 장비병은 현대 의학으로도 치료가 불가능하네요. 💸", author: "장비 수집가" },
  { type: 'ADVICE', text: "여름 러닝은 심박수가 평소보다 10~15bpm 높을 수 있습니다. 무더운 날엔 거리보다 수분 섭취와 체온 관리에 집중하세요. 💧", author: "기온 정보국" },
  { type: 'JOKE', text: "마라톤 도중 물 보급소에서 컵을 던지는 모습이 멋져 보여서 따라 해봤는데, 제 옷에 다 쏟았습니다. 🥤", author: "초보 러너" },
  { type: 'QUOTE', text: "남들과 비교하지 마세요. 어제의 자신보다 단 1m라도 더 나아갔다면 그것으로 완벽합니다. ✨", author: "페이스 메이커" },
  { type: 'JOKE', text: "달리기를 하면서 깨달은 진리: 오르막길이 있으면... 반드시 또 다른 오르막길이 나옵니다. ⛰️", author: "고갯길 러너" },
  { type: 'ADVICE', text: "달리기 전 스트레칭은 동적 스트레칭(가볍게 움직이기)으로, 마친 후에는 정적 스트레칭(늘려주기)으로 마무리해야 근육이 덜 뭉칩니다. 🧘‍♂️", author: "부상 방지 위원회" }
]

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [records, setRecords] = useState<RunningRecord[]>([])
  const [survival, setSurvival] = useState<SurvivalStatus | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Social Interaction states
  const [likes, setLikes] = useState<DBLike[]>([])
  const [comments, setComments] = useState<DBComment[]>([])
  const [activeCommentRecordId, setActiveCommentRecordId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [hasPbsMap, setHasPbsMap] = useState<Record<string, boolean>>({})

  // active mission state
  const [activeMission, setActiveMission] = useState<any>(null)

  const handleAbandonMission = () => {
    if (confirm('현재 도전 중인 랜덤 미션을 포기하시겠습니까?')) {
      localStorage.removeItem('src_active_mission')
      setActiveMission(null)
    }
  }

  // Tip/Joke widget states
  const [currentTipIdx, setCurrentTipIdx] = useState(0)
  const [tipFade, setTipFade] = useState(true)

  // 피드 아코디언 상태
  const [isFeedOpen, setIsFeedOpen] = useState(false)
  const [isStretchingOpen, setIsStretchingOpen] = useState(false)

  const handleShuffleTip = (e: React.MouseEvent<HTMLButtonElement>) => {
    setTipFade(false)
    triggerReactionParticles(e.clientX, e.clientY, 'clap')
    
    setTimeout(() => {
      let nextIdx = Math.floor(Math.random() * RUNNING_TIPS.length)
      while (nextIdx === currentTipIdx && RUNNING_TIPS.length > 1) {
        nextIdx = Math.floor(Math.random() * RUNNING_TIPS.length)
      }
      setCurrentTipIdx(nextIdx)
      setTipFade(true)
    }, 200)
  }

  // 컴포넌트 마운트 시 로컬 스토리지 또는 Supabase로부터 실시간 동적 바인딩
  useEffect(() => {
    const mockCheck = checkIsMock()
    setIsMock(mockCheck)
    loadData(mockCheck)
    setCurrentTipIdx(Math.floor(Math.random() * RUNNING_TIPS.length))

    const saved = localStorage.getItem('src_active_mission')
    if (saved) {
      try {
        setActiveMission(JSON.parse(saved))
      } catch (e) {}
    }
  }, [])

  const loadData = async (mockCheck?: boolean) => {
    const activeIsMock = mockCheck !== undefined ? mockCheck : isMock
    setError(null)
    
    try {
      if (activeIsMock) {
        const activeProfile = mockStore.getProfile()
        const activeRecords = mockStore.getRunningRecords()
        
        // 내 기록만 필터링하여 생존 조건 연산 수행
        const myRecords = activeRecords.filter(rec => rec.user_id === activeProfile.id)
        const survivalCalc = calculateMonthlySurvival(myRecords, activeProfile.is_exempted, '2026-05')

        setProfile(activeProfile)
        setRecords(activeRecords)
        setSurvival(survivalCalc)

        // Mock PBs mapping
        const pbs = mockStore.getMarathonPBs()
        setHasPbsMap({ [activeProfile.id]: pbs.length > 0 })
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('로그인 세션이 유효하지 않습니다. 다시 로그인해 주세요.')
          return
        }

        const { data: activeProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileErr) {
          setError(`프로필 정보를 불러오는데 실패했습니다: ${profileErr.message}`)
          return
        }
        
        if (!activeProfile) {
          setError('가입된 프로필이 존재하지 않습니다. 먼저 온보딩을 진행해 주세요.')
          return
        }

        // Fetch records
        const { data: dbRecords, error: recordsErr } = await supabase
          .from('running_records')
          .select('*, profiles(nickname, avatar_url)')
          .order('date', { ascending: false })

        if (recordsErr) {
          setError(`러닝 기록을 불러오는데 실패했습니다: ${recordsErr.message}`)
          return
        }

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
          is_pacer: rec.is_pacer,
          proof_image_url: rec.proof_image_url || ''
        }))

        // Fetch likes
        const { data: dbLikes } = await supabase
          .from('running_record_likes')
          .select('*')
        
        // Fetch comments
        const { data: dbComments } = await supabase
          .from('running_record_comments')
          .select('*, profiles(nickname, avatar_url)')
          .order('created_at', { ascending: true })

        // Fetch PBs metadata to show PB badges
        const { data: dbPbs } = await supabase
          .from('marathon_pbs')
          .select('user_id')
        
        const pbsMapping: Record<string, boolean> = {}
        if (dbPbs) {
          dbPbs.forEach((pb: any) => {
            pbsMapping[pb.user_id] = true
          })
        }

        const myRecords = formattedRecords.filter(rec => rec.user_id === activeProfile.id)
        const survivalCalc = calculateMonthlySurvival(myRecords, activeProfile.is_exempted, '2026-05')

        setProfile(activeProfile as Profile)
        setRecords(formattedRecords)
        setSurvival(survivalCalc)
        setLikes(dbLikes || [])
        setComments((dbComments || []).map((c: any) => ({
          id: c.id,
          record_id: c.record_id,
          user_id: c.user_id,
          comment_text: c.comment_text,
          created_at: c.created_at,
          profiles: {
            nickname: c.profiles?.nickname || '크루원',
            avatar_url: c.profiles?.avatar_url || ''
          }
        })))
        setHasPbsMap(pbsMapping)
      }
    } catch (e: any) {
      console.error(e)
      setError(`대시보드 데이터를 로드하는 중 예기치 못한 오류가 발생했습니다: ${e.message || String(e)}`)
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

  // 좋아요 토글 핸들러
  const handleToggleLike = async (recordId: string) => {
    if (!profile) return

    if (isMock) {
      mockStore.toggleLikeRunningRecord(recordId, profile.id)
      loadData(true)
    } else {
      const supabase = createClient()
      const existingLike = likes.find(l => l.record_id === recordId && l.user_id === profile.id)

      if (existingLike) {
        const { error } = await supabase
          .from('running_record_likes')
          .delete()
          .eq('id', existingLike.id)
        if (error) {
          alert('좋아요 취소 실패')
        } else {
          setLikes(prev => prev.filter(l => l.id !== existingLike.id))
        }
      } else {
        const { data, error } = await supabase
          .from('running_record_likes')
          .insert([{ record_id: recordId, user_id: profile.id }])
          .select()
        if (error) {
          alert('좋아요 등록 실패')
        } else if (data) {
          setLikes(prev => [...prev, data[0]])
        }
      }
    }
  }

  // 댓글 추가 핸들러
  const handleAddComment = async (recordId: string) => {
    if (!newCommentText.trim() || !profile) return

    if (isMock) {
      mockStore.addCommentToRunningRecord(recordId, profile.id, newCommentText.trim())
      setNewCommentText('')
      loadData(true)
    } else {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('running_record_comments')
        .insert([{
          record_id: recordId,
          user_id: profile.id,
          comment_text: newCommentText.trim()
        }])
        .select('*, profiles(nickname, avatar_url)')
      
      if (error) {
        alert('댓글 등록에 실패했습니다.')
      } else if (data) {
        const newCmt = {
          id: data[0].id,
          record_id: data[0].record_id,
          user_id: data[0].user_id,
          comment_text: data[0].comment_text,
          created_at: data[0].created_at,
          profiles: {
            nickname: data[0].profiles?.nickname || profile.nickname,
            avatar_url: data[0].profiles?.avatar_url || profile.avatar_url
          }
        }
        setComments(prev => [...prev, newCmt])
        setNewCommentText('')
      }
    }
  }

  // 댓글 삭제 핸들러
  const handleDeleteComment = async (recordId: string, commentId: string) => {
    if (confirm('댓글을 삭제하시겠습니까?')) {
      if (isMock) {
        mockStore.deleteCommentFromRunningRecord(recordId, commentId)
        loadData(true)
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('running_record_comments')
          .delete()
          .eq('id', commentId)
        if (error) {
          alert('댓글 삭제 실패')
        } else {
          setComments(prev => prev.filter(c => c.id !== commentId))
        }
      }
    }
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4 min-h-screen bg-slate-50">
        <div className="bg-white border border-rose-200 p-6 rounded-3xl max-w-sm shadow-xl flex flex-col items-center gap-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 animate-bounce" />
          <h2 className="text-sm font-black text-slate-800">대시보드 로드 오류</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            {error}
          </p>
          <button
            onClick={() => loadData()}
            className="mt-2 w-full h-10 bg-[#2563EB] text-white hover:bg-[#2563EB]/95 font-extrabold text-xs rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!profile || !survival) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-screen bg-slate-50">
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

  // 7일간의 러닝 통계 그래프 데이터 생성
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('ko-KR', { weekday: 'short' })
    return { dateStr, label, distance: 0 }
  }).reverse()

  last7Days.forEach(day => {
    const myRecs = records.filter(r => r.user_id === profile.id && r.date === day.dateStr)
    day.distance = myRecs.reduce((sum, r) => sum + r.distance, 0)
  })

  const maxChartDist = Math.max(...last7Days.map(d => d.distance), 1)

  // 내 기록 거리 합계
  const myTotalDistance = records
    .filter(r => r.user_id === profile.id)
    .reduce((sum, r) => sum + r.distance, 0)

  // 내 획득 배지 리스트
  const myBadges = getBadgesForUser(
    records.filter(r => r.user_id === profile.id), 
    hasPbsMap[profile.id] || false
  )

  return (
    <div className="p-5 flex flex-col relative select-none bg-white">
      
      {/* 1. 상단 사용자 프로필 헤더 */}
      <header className="flex items-center justify-between mb-6 z-10 relative bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full blur-[2px] opacity-60" />
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
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-800 tracking-tight">{profile.nickname}</span>
              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border uppercase ${currentRoleBadge.style}`}>
                {currentRoleBadge.label}
              </span>
            </div>
            <span className="text-[8px] text-slate-400 font-extrabold tracking-wider mt-0.5">내 누적 기록: {myTotalDistance.toFixed(1)} km</span>
          </div>
        </div>

        {(profile.role === 'ADMIN' || profile.can_view_admin) && (
          <Link
            href="/admin"
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
            title="관리자 설정"
          >
            ⚙️
          </Link>
        )}
      </header>

      {/* 활성화된 랜덤 러닝 미션 알림 */}
      {activeMission && (
        <section className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-250 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn z-10 relative">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              🎯
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] text-amber-600 font-extrabold uppercase tracking-widest">Active Crew Mission</span>
              <h4 className="text-xs font-black text-slate-800 tracking-tight">{activeMission.title}</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{activeMission.text}</p>
            </div>
          </div>
          <button
            onClick={handleAbandonMission}
            className="text-[9px] font-black text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100/60 px-2 py-1 rounded-xl cursor-pointer transition-colors shrink-0 ml-3"
          >
            미션 포기
          </button>
        </section>
      )}

      {/* 2. 월간 생존(활동) 카운터 & 게이지 보드 (Strava Vibe) */}
      <div className={survival.survived ? 'glowing-survived-card-wrapper mb-6' : 'mb-6'}>
        <section className={`bg-white rounded-3xl p-5 border border-slate-200 relative overflow-hidden select-none z-10 animate-fadeIn shadow-sm`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                <Flame className={`w-4.5 h-4.5 ${survival.survived ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold tracking-widest uppercase">Survival Status</span>
                <h2 className="text-xs font-black tracking-wide text-slate-800">5월 생존 리포트</h2>
              </div>
            </div>
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

          {survival.exempted ? (
            <div className="py-4 text-center text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-2xl border border-slate-200/60 p-4">
              🩹 <strong className="text-blue-600 font-extrabold">부상 면제 회원</strong>으로 등록되어 있습니다.<br />
              이번 달 생존자로 자동 분류됩니다. 쾌차를 빕니다!
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">인증 현황</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 border border-slate-250 p-3 rounded-2xl flex flex-col gap-0.5 shadow-sm">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">정기 벙</span>
                      <span className="text-sm font-black text-slate-800">{survival.regularDays}회</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-250 p-3 rounded-2xl flex flex-col gap-0.5 shadow-sm">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">개인런</span>
                      <span className="text-sm font-black text-slate-800">{survival.personalDays}회</span>
                    </div>
                  </div>
                </div>

                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <defs>
                      <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      className="stroke-slate-100"
                      strokeWidth="5"
                      fill="transparent"
                    />
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
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-sm font-black text-slate-800 tracking-tight">{survival.totalDays}일</span>
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">목표 6일</span>
                  </div>
                </div>
              </div>

              {/* 가이드 메시지 */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
                {survival.survived ? (
                  <div className="flex gap-2 items-start text-[10px] text-blue-650">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 animate-pulse" />
                    <span className="leading-relaxed font-bold">
                      <strong className="text-slate-800 font-black">미션 완료!</strong> 이번 달 생존 조건을 충족했습니다. 부상 없는 러닝 라이프 되세요!
                    </span>
                  </div>
                ) : (
                  <div className="bg-rose-50/40 border border-rose-200 p-3 rounded-2xl flex flex-col gap-2 shadow-sm animate-pulse">
                    <div className="flex items-center gap-1.5 text-rose-650 font-black text-[10px] tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                      <span>⚠️ 생존 조건 미달 상태 (방출 경고)</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                      이번 달 생존 기준을 달성하지 못했습니다. 아래 조건 중 하나를 충족하지 못하면 다음 달 멤버십 유지(출석)가 어려울 수 있으니 서둘러 인증해 주세요!
                    </p>
                    <div className="flex flex-col gap-1 text-[9.5px] pt-1 text-slate-500">
                      <div className="font-extrabold text-slate-700">남은 필요 조건 (택 1):</div>
                      <ul className="space-y-1 pl-1">
                        <li className="flex items-center gap-1.5">
                          <span className="text-blue-500 font-extrabold">•</span>
                          <span>정기 벙 {survival.remainingRegularForA}회 + 추가 러닝 {survival.remainingTotalForA}회</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="text-blue-500 font-extrabold">•</span>
                          <span>개인 러닝 {survival.remainingTotalForB}회</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 3. 최근 7일 내 러닝 통계 차트 (Strava Vibe) */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-800">최근 7일 러닝 통계 (km)</h3>
          </div>
          <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider">My Weekly Activity</span>
        </div>

        {/* Custom SVG responsive graph */}
        <div className="w-full h-32 flex items-end justify-between px-2 pt-4">
          {last7Days.map((day, idx) => {
            const heightPercent = (day.distance / maxChartDist) * 80 // Max height is 80px
            return (
              <div key={idx} className="flex flex-col items-center flex-1 group">
                <span className="text-[8px] text-blue-600 font-black opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-1">
                  {day.distance > 0 ? `${day.distance.toFixed(1)}k` : ''}
                </span>
                <div className="w-6 bg-slate-100 rounded-t-md relative overflow-hidden h-20 flex items-end">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-black tracking-wider mt-1.5">
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. 나의 획득 배지 (Badges Showcase) */}
      {myBadges.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-slate-800">내가 획득한 러너 배지</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {myBadges.map(badge => (
              <div 
                key={badge.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black tracking-wide shadow-sm ${badge.color}`}
              >
                <span>{badge.emoji}</span>
                <span>{badge.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. 퀵 메뉴 그리드 */}
      <section className="grid grid-cols-2 gap-4 mb-6 z-10 relative">
        <Link
          href="/record"
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group shadow-sm hover:-translate-y-0.5"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-100 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all duration-300">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-black tracking-wide text-slate-800 mt-1">러닝 기록 인증</span>
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">최소 3km 이상 등록</span>
        </Link>
        
        <Link
          href="/members"
          className="bg-white border border-slate-200 hover:border-amber-300 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group shadow-sm hover:-translate-y-0.5"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-100 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300">
            <Trophy className="w-5 h-5" />
          </div>
          <span className="text-xs font-black tracking-wide text-slate-800 mt-1">크루원 PB 보드</span>
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">마라톤 3대 기록 경쟁</span>
        </Link>
      </section>

      {/* 5.5. 복불복 게임 존 바로가기 배너 */}
      <section className="mb-6 z-10 relative">
        <Link
          href="/playground"
          className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-3xl p-5 flex items-center justify-between overflow-hidden shadow-md group cursor-pointer hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-700/80 to-pink-500/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-[8px] text-pink-200 font-extrabold uppercase tracking-widest">Crew Game Zone</span>
            <h3 className="text-xs font-black tracking-wide flex items-center gap-1.5 text-white">
              <span>🎲 크루 복불복 오락실 오픈!</span>
              <span className="bg-rose-500 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase text-white tracking-normal animate-pulse">NEW</span>
            </h3>
            <span className="text-[9px] text-indigo-100 font-medium">오늘 음료수 쏠 당첨자를 룰렛으로 골라보세요.</span>
          </div>
          
          <div className="relative z-10 w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-lg group-hover:rotate-12 transition-transform shadow-inner text-white">
            👉
          </div>
        </Link>
      </section>

      {/* 5.8. 러닝 전 필수! 동적 스트레칭 가이드 (Collapsible) */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 mb-6 shadow-sm z-10 relative">
        <button
          onClick={() => setIsStretchingOpen(!isStretchingOpen)}
          className="w-full flex items-center justify-between text-xs font-black text-slate-800 hover:text-slate-700 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-500">🧘‍♂️</span>
            <span>러닝 전 필수 동적 스트레칭 & 러닝 드릴 (10단계)</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isStretchingOpen ? 'rotate-180' : ''}`} />
        </button>

        {isStretchingOpen && (
          <div className="mt-4 pt-4 border-t border-slate-150 space-y-4 animate-fadeIn">
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              달리기 전에 관절과 근육을 부드럽게 깨워주는 <strong className="text-emerald-600 font-extrabold">동적 스트레칭</strong>입니다. 반동을 주며 가볍게 움직이는 동작 위주로 순서대로 진행해 주세요!
            </p>

            <div className="space-y-3">
              {[
                {
                  step: 1,
                  title: '발목 & 손목 돌리기 💫',
                  desc: '한쪽 발끝을 땅에 대고 뒤꿈치를 들고 발목과 손목을 좌우로 부드럽게 각각 10회씩 돌려줍니다.',
                  detail: '관절 윤활액 분비 촉진 & 발목 부상 예방'
                },
                {
                  step: 2,
                  title: '무릎 굽히고 돌리기 🦵',
                  desc: '양손으로 무릎을 짚고 안에서 밖으로, 밖에서 안으로 원을 그리며 회전한 후, 가볍게 굽혔다 펴줍니다. (각 10회)',
                  detail: '무릎 관절 부하 경감'
                },
                {
                  step: 3,
                  title: '골반 및 고관절 회전 🔄',
                  desc: '양손을 골반에 얹고 골반을 좌우로 크게 원을 그리며 돌려줍니다. 양방향 각각 5회씩 크게 회전해 주세요.',
                  detail: '고관절 가동 범위 확대'
                },
                {
                  step: 4,
                  title: '다리 앞뒤 스윙 🤸‍♂️',
                  desc: '한 손으로 벽이나 나무를 짚고, 한쪽 다리를 시계추처럼 앞뒤로 시원하게 10회 흔들어줍니다. (반대쪽도 동일)',
                  detail: '햄스트링 & 대퇴사두근 활성화'
                },
                {
                  step: 5,
                  title: '다이내믹 사이드 & 포워드 런지 🏃',
                  desc: '제자리에서 한 발을 앞으로/옆으로 크게 내딛으며 앉았다가 제자리로 돌아옵니다. 좌우 번갈아가며 각 5회 실시합니다.',
                  detail: '허벅지 전반 및 안쪽 내전근 자극'
                },
                {
                  step: 6,
                  title: '스파이더맨 런지 (장요근 깊게 늘리기) 🕸️',
                  desc: '엎드린 푸쉬업 자세에서 한 발을 같은 손 바로 옆으로 디딘 후, 골반을 지그시 아래로 내리며 앞쪽 고관절을 늘립니다. (각 5초 유지, 좌우 3회)',
                  detail: '굳어있던 장요근 이완 & 보폭 향상'
                },
                {
                  step: 7,
                  title: '종아리 & 아킬레스건 늘리기 🩹',
                  desc: '한쪽 다리를 뒤로 길게 뻗고 뒤꿈치를 땅에 밀착시킵니다. 체중을 앞다리에 실으며 종아리와 아킬레스건을 지그시 늘려줍니다. (각 15초 유지)',
                  detail: '아킬레스건염 예방 & 부상 방지 최종 점검'
                },
                {
                  step: 8,
                  title: '[러닝 드릴] A-스킵 (A-Skip) 🦘',
                  desc: '리드미컬한 스킵 박자에 맞춰 가볍게 바운스를 타며, 한쪽 무릎을 골반 높이까지 빠르게 수직으로 올렸다 내립니다. (양방향 각 15~20회)',
                  detail: '올바른 무릎 피치 자세 & 발목 스프링 탄성 훈련'
                },
                {
                  step: 9,
                  title: '[러닝 드릴] B-스킵 (B-Skip - 햄스트링 핵심!) 🦵',
                  desc: 'A-스킵처럼 무릎을 들어 올린 직후, 다리를 앞으로 가볍게 뻗었다가 햄스트링의 힘으로 지면을 할퀴듯이(Pawing) 빠르게 뒤로 쓸어내려 착지합니다. (각 15~20회)',
                  detail: '햄스트링의 동적 활성화 & 강력한 지면 반발력 확보'
                },
                {
                  step: 10,
                  title: '[러닝 드릴] C-스킵 (C-Skip) 🔄',
                  desc: '스킵 박자 속에서 무릎을 정면으로 한 번 들어 올린 후, 곧바로 같은 다리를 바깥쪽(측면)으로 외회전하여 골반을 열어주며 올립니다. (각 10회)',
                  detail: '고관절 외전근 활성화 & 골반 주변부 유연성 극대화'
                }
              ].map((item) => (
                <div key={item.step} className="flex gap-3 bg-slate-50 border border-slate-200/60 p-3 rounded-2xl shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 font-black text-[10px]">
                    {item.step}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-xs font-black text-slate-800">{item.title}</h4>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium">{item.desc}</p>
                    <span className="text-[8px] text-emerald-600 font-extrabold uppercase tracking-wide mt-1">✨ 효과: {item.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50/40 border border-emerald-150 p-3 rounded-2xl flex gap-2 items-start text-[9px] text-emerald-700 leading-relaxed font-bold">
              💡 <strong>TIP:</strong> 달리기 전에는 멈춰서 늘려주는 정적 스트레칭보다 이렇게 몸을 움직이는 <strong>동적 스트레칭</strong>이 훨씬 효과적입니다. 러닝이 완전히 끝난 후에 멈춰서 늘려주세요!
            </div>
          </div>
        )}
      </section>

      {/* 오늘의 러닝 동반자 (Inspiring Advice/Quote/Joke Card) */}
      <section className="bg-gradient-to-r from-blue-50/45 via-indigo-50/20 to-emerald-50/45 border border-slate-200/80 rounded-3xl p-4.5 mb-6 shadow-sm relative overflow-hidden select-none animate-fadeIn">
        <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-blue-100/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            <h3 className="text-xs font-black text-slate-800">
              {RUNNING_TIPS[currentTipIdx]?.type === 'QUOTE' && '🍀 오늘의 러닝 명언'}
              {RUNNING_TIPS[currentTipIdx]?.type === 'JOKE' && '🤪 위트있는 러닝 한마디'}
              {RUNNING_TIPS[currentTipIdx]?.type === 'ADVICE' && '🩹 유용한 러닝 조언'}
            </h3>
          </div>
          <button
            onClick={handleShuffleTip}
            className="flex items-center gap-1 text-[9px] font-black text-blue-600 hover:text-blue-700 bg-white border border-slate-200/80 rounded-xl px-2.5 py-1 shadow-sm transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <span>🔄 다른 이야기</span>
          </button>
        </div>

        <div className={`transition-all duration-300 ${tipFade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
          <p className="text-xs font-semibold text-slate-700 leading-relaxed min-h-[40px] flex items-center">
            "{RUNNING_TIPS[currentTipIdx]?.text}"
          </p>
          <div className="flex items-center justify-end mt-1.5">
            <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
              — {RUNNING_TIPS[currentTipIdx]?.author}
            </span>
          </div>
        </div>
      </section>

      {/* 6. 실시간 크루 인증 피드 */}
      <section className="flex-1 flex flex-col select-none z-10 relative">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setIsFeedOpen(!isFeedOpen)}
            className="w-full flex items-center justify-between text-[9px] font-black text-slate-550 hover:text-slate-700 tracking-widest uppercase cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>실시간 크루 인증 피드</span>
              <span className="text-[8px] text-blue-650 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full font-black tracking-wider normal-case">
                5월 총 {records.length}개
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isFeedOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isFeedOpen && (
          records.length === 0 ? (
          <div className="flex-1 min-h-[180px] bg-slate-50 border border-slate-200 rounded-3xl flex flex-col items-center justify-center p-6 text-slate-400 text-center">
            <span className="text-xs font-bold text-slate-500">📪 이번 달 등록된 러닝 기록이 없습니다.</span>
            <span className="text-[8px] text-slate-400 mt-1.5 uppercase font-black tracking-widest">Start the first run today</span>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => {
              const isMine = rec.user_id === profile.id
              const recordLikes = likes.filter(l => l.record_id === rec.id)
              const hasLiked = likes.some(l => l.record_id === rec.id && l.user_id === profile.id)

              // Mock mode likes fallback
              const mockLikesCount = isMock ? (rec.likes?.length || 0) : recordLikes.length
              const mockHasLiked = isMock ? (rec.likes?.includes(profile.id) || false) : hasLiked

              // Comments fallback
              const recordComments = comments.filter(c => c.record_id === rec.id)
              const feedComments = isMock
                ? (rec.comments || []).map(cmt => ({
                    id: cmt.id,
                    user_id: cmt.user_id,
                    user_nickname: cmt.user_nickname,
                    user_avatar: cmt.user_avatar,
                    comment_text: cmt.comment_text,
                    created_at: cmt.created_at
                  }))
                : recordComments.map(cmt => ({
                    id: cmt.id,
                    user_id: cmt.user_id,
                    user_nickname: cmt.profiles?.nickname || '신규 크루원',
                    user_avatar: cmt.profiles?.avatar_url || '',
                    comment_text: cmt.comment_text,
                    created_at: cmt.created_at
                  }))

              // Calculate runner's badges dynamically
              const runnerRecords = records.filter(r => r.user_id === rec.user_id)
              const runnerBadges = getBadgesForUser(runnerRecords, hasPbsMap[rec.user_id] || false)

              return (
                <div
                  key={rec.id}
                  className="bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-4 flex flex-col shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* 크루원 아바타 */}
                      {rec.user_avatar ? (
                        <div className="relative shrink-0">
                          {rec.is_pacer && (
                            <div className="absolute -inset-0.5 bg-amber-500 rounded-full blur-[1px]" />
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-800">{rec.user_nickname}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border tracking-wide ${
                            rec.type === 'REGULAR'
                              ? 'bg-blue-50 text-blue-600 border-blue-100'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {rec.type === 'REGULAR' ? '정기 벙' : '개인런'}
                          </span>
                          {rec.is_pacer && (
                            <span className="text-[9px]" title="페이서로 활약 🎈">
                              🎈
                            </span>
                          )}
                        </div>
                        
                        {/* 러닝 상세 메타 */}
                        <div className="flex items-center gap-2.5 text-[8px] text-slate-400 font-extrabold tracking-wider">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {rec.location_name}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
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

                      {isMine && (
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                          title="기록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Runner's badges row */}
                  {runnerBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {runnerBadges.map(badge => (
                        <span 
                          key={badge.id} 
                          className="inline-block text-[8px] font-black px-1.5 py-0.2 rounded bg-slate-50 border border-slate-200 text-slate-600"
                          title={badge.name}
                        >
                          {badge.emoji} {badge.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Proof screenshot image if present */}
                  {rec.proof_image_url && (
                    <div className="mt-3.5 rounded-xl overflow-hidden border border-slate-100 max-h-48 bg-slate-50">
                      <img 
                        src={rec.proof_image_url} 
                        alt="Proof Image" 
                        className="w-full h-full object-cover max-h-48"
                        onClick={() => {
                          // Simple alert/popup simulation or window open
                          window.open(rec.proof_image_url, '_blank')
                        }}
                      />
                    </div>
                  )}

                  {/* Likes & Comments Social Action Bar */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[10px] font-black text-slate-500">
                    <button 
                      onClick={() => handleToggleLike(rec.id)}
                      className={`flex items-center gap-1 hover:text-rose-500 cursor-pointer transition-colors ${mockHasLiked ? 'text-rose-500' : ''}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${mockHasLiked ? 'fill-rose-500' : ''}`} />
                      <span>{mockLikesCount}</span>
                    </button>

                    <button 
                      onClick={() => setActiveCommentRecordId(activeCommentRecordId === rec.id ? null : rec.id)}
                      className={`flex items-center gap-1 hover:text-blue-600 cursor-pointer transition-colors ${activeCommentRecordId === rec.id ? 'text-blue-600' : ''}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{feedComments.length}</span>
                    </button>
                  </div>

                  {/* Comments Drawer/Box */}
                  {activeCommentRecordId === rec.id && (
                    <div className="mt-3 bg-slate-50/50 border border-slate-200/50 p-3 rounded-2xl animate-fadeIn space-y-3">
                      {feedComments.length === 0 ? (
                        <p className="text-[9px] text-slate-400 font-bold text-center py-2">아직 댓글이 없습니다. 첫 소통을 남겨보세요! 💬</p>
                      ) : (
                        <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                          {feedComments.map((cmt) => (
                            <div key={cmt.id} className="flex gap-2 items-start text-[10px]">
                              {cmt.user_avatar ? (
                                <img src={cmt.user_avatar} className="w-6 h-6 rounded-full object-cover border border-slate-200 mt-0.5 shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] mt-0.5 shrink-0">🏃</div>
                              )}
                              <div className="flex-1 bg-white border border-slate-200/80 p-2 rounded-xl">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-black text-slate-800">{cmt.user_nickname}</span>
                                  {(cmt.user_id === profile.id || profile.role === 'ADMIN') && (
                                    <button 
                                      onClick={() => handleDeleteComment(rec.id, cmt.id)}
                                      className="text-slate-400 hover:text-rose-500 text-[8px] font-black cursor-pointer"
                                    >
                                      삭제
                                    </button>
                                  )}
                                </div>
                                <p className="text-slate-700 font-semibold leading-relaxed">{cmt.comment_text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Input */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleAddComment(rec.id)
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          placeholder="응원의 한마디..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          className="flex-1 h-9 bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 text-[10px] font-bold outline-none"
                        />
                        <button
                          type="submit"
                          className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 cursor-pointer shadow-sm shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
        )}
      </section>
    </div>
  )
}
