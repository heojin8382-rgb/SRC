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
  TrendingUp
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

  // 컴포넌트 마운트 시 로컬 스토리지 또는 Supabase로부터 실시간 동적 바인딩
  useEffect(() => {
    const mockCheck = checkIsMock()
    setIsMock(mockCheck)
    loadData(mockCheck)
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

  // 리액션 토글 핸들러 (파티클 애니메이션 및 DB 호환)
  const handleToggleReaction = async (e: React.MouseEvent<HTMLButtonElement>, recordId: string, emoji: '🔥' | '⚡' | '👏') => {
    if (!profile) return

    // 1. 클릭 위치에서 파티클 뿜기
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    
    let theme: 'fire' | 'lightning' | 'clap' = 'fire'
    if (emoji === '⚡') theme = 'lightning'
    if (emoji === '👏') theme = 'clap'
    triggerReactionParticles(x, y, theme)

    // 2. 데이터 상태 업데이트
    if (isMock) {
      mockStore.toggleReactionRunningRecord(recordId, profile.id, emoji)
      loadData(true)
    } else {
      if (emoji === '🔥') {
        const supabase = createClient()
        const existingLike = likes.find(l => l.record_id === recordId && l.user_id === profile.id)

        if (existingLike) {
          const { error } = await supabase
            .from('running_record_likes')
            .delete()
            .eq('id', existingLike.id)
          if (error) {
            alert('리액션 취소 실패')
          } else {
            setLikes(prev => prev.filter(l => l.id !== existingLike.id))
          }
        } else {
          const { data, error } = await supabase
            .from('running_record_likes')
            .insert([{ record_id: recordId, user_id: profile.id }])
            .select()
          if (error) {
            alert('리액션 등록 실패')
          } else if (data) {
            setLikes(prev => [...prev, data[0]])
          }
        }
      } else {
        // ⚡ & 👏는 로컬 mockStore 및 UI 로컬 상태로 반영
        mockStore.toggleReactionRunningRecord(recordId, profile.id, emoji)
        setRecords(prev => prev.map(rec => {
          if (rec.id === recordId) {
            const reactions = rec.reactions || { '🔥': [], '⚡': [], '👏': [] }
            const emojiList = reactions[emoji] || []
            const hasReacted = emojiList.includes(profile.id)
            return {
              ...rec,
              reactions: {
                ...reactions,
                [emoji]: hasReacted ? emojiList.filter(id => id !== profile.id) : [...emojiList, profile.id]
              }
            }
          }
          return rec
        }))
      }
    }
  }

  // 좋아요 토글 핸들러 (레거시/호환용 보존)
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4 min-h-screen bg-[#0B0F19]">
        <div className="glass-card p-6 rounded-3xl max-w-sm shadow-xl flex flex-col items-center gap-3 border border-rose-900/50">
          <AlertTriangle className="w-10 h-10 text-rose-500 animate-bounce" />
          <h2 className="text-sm font-black text-white">대시보드 로드 오류</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            {error}
          </p>
          <button
            onClick={() => loadData()}
            className="mt-2 w-full h-10 bg-brand-neon text-slate-900 hover:bg-brand-neon/95 font-extrabold text-xs rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!profile || !survival) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-screen bg-[#0B0F19]">
        <span className="text-xs text-slate-500 animate-pulse font-bold tracking-widest">대시보드 구성 중...</span>
      </div>
    )
  }

  // 역할군 배지 매핑
  const roleBadges: Record<string, { label: string; style: string; emoji: string }> = {
    WAITING: { label: '대기회원', style: 'bg-slate-800 text-slate-400 border-slate-700', emoji: '⏳' },
    REGULAR: { label: '정회원', style: 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50', emoji: '🔥' },
    PACER: { label: '페이서', style: 'bg-amber-950/50 text-amber-400 border-amber-900/50', emoji: '🎈' },
    ADMIN: { label: '운영자', style: 'bg-blue-950/50 text-blue-400 border-blue-900/50 shadow-[0_0_10px_rgba(37,99,235,0.2)]', emoji: '⚡' },
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
    <div className="p-5 flex flex-col relative select-none bg-transparent">
      
      {/* 1. 상단 사용자 프로필 헤더 */}
      <header className="flex items-center justify-between mb-6 z-10 relative bg-slate-900/40 p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-neon to-brand-aqua rounded-full blur-[2px] opacity-60" />
              <img
                src={profile.avatar_url}
                alt="My Avatar"
                className="relative w-11 h-11 rounded-full object-cover border border-white/10"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-sm shadow-inner text-slate-400">
              🏃
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-tight">{profile.nickname}</span>
              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border uppercase ${currentRoleBadge.style}`}>
                {currentRoleBadge.label}
              </span>
            </div>
            <span className="text-[8px] text-slate-400 font-bold tracking-wider mt-0.5">내 누적 기록: {myTotalDistance.toFixed(1)} km</span>
          </div>
        </div>

        {(profile.role === 'ADMIN' || profile.can_view_admin) && (
          <Link
            href="/admin"
            className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-all text-slate-400 hover:text-white cursor-pointer"
            title="관리자 설정"
          >
            ⚙️
          </Link>
        )}
      </header>

      {/* 2. 월간 생존(활동) 카운터 & 게이지 보드 (Strava Vibe) */}
      <div className={survival.survived ? 'glowing-survived-card-wrapper mb-6' : 'mb-6'}>
        <section className={`glass-card rounded-3xl p-5 relative overflow-hidden select-none z-10 animate-fadeIn shadow-lg`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900/60 flex items-center justify-center border border-white/5 shadow-sm">
                <Flame className={`w-4.5 h-4.5 ${survival.survived ? 'text-brand-neon animate-pulse drop-shadow-[0_0_8px_rgba(212,255,63,0.6)]' : 'text-slate-500'}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold tracking-widest uppercase">Survival Status</span>
                <h2 className="text-xs font-black tracking-wide text-white">5월 생존 리포트</h2>
              </div>
            </div>
            <span className={`text-[8px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border transition-all duration-350 ${
              survival.survived
                ? 'bg-brand-neon/10 text-brand-neon border-brand-neon/20 shadow-[0_0_10px_rgba(212,255,63,0.15)]'
                : survival.totalDays === 0
                ? 'bg-rose-950/40 text-rose-400 border-rose-900/50'
                : 'bg-amber-950/40 text-amber-400 border-amber-900/50'
            }`}>
              {survival.statusMessage}
            </span>
          </div>

          {survival.exempted ? (
            <div className="py-4 text-center text-xs text-slate-400 leading-relaxed bg-slate-900/40 rounded-2xl border border-white/5 p-4">
              🩹 <strong className="text-brand-neon font-extrabold">부상 면제 회원</strong>으로 등록되어 있습니다.<br />
              이번 달 생존자로 자동 분류됩니다. 쾌차를 빕니다!
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">인증 현황</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl flex flex-col gap-0.5 shadow-sm">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">정기 벙</span>
                      <span className="text-sm font-black text-white">{survival.regularDays}회</span>
                    </div>
                    <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl flex flex-col gap-0.5 shadow-sm">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">개인런</span>
                      <span className="text-sm font-black text-white">{survival.personalDays}회</span>
                    </div>
                  </div>
                </div>

                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <defs>
                      <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#D4FF3F" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      className="stroke-slate-900"
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
                    <span className="text-sm font-black text-white tracking-tight">{survival.totalDays}일</span>
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">목표 6일</span>
                  </div>
                </div>
              </div>

              {/* 가이드 메시지 */}
              <div className="p-3.5 bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col gap-1.5 shadow-sm">
                {survival.survived ? (
                  <div className="flex gap-2 items-start text-[10px] text-brand-neon">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-neon animate-pulse" />
                    <span className="leading-relaxed font-bold">
                      <strong className="text-white font-black">미션 완료!</strong> 이번 달 생존 조건을 충족했습니다. 부상 없는 러닝 라이프 되세요!
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 text-[10px] text-slate-400">
                    <div className="flex gap-1.5 items-center font-black tracking-wider uppercase text-[9px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span className="text-amber-400">달성 필요 조건 (택 1):</span>
                    </div>
                    <ul className="space-y-1.5 pl-0.5">
                      <li className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-brand-aqua mt-1 shrink-0">•</span>
                        <span>
                          <strong className="text-slate-250 font-bold">벙 위주:</strong> 정기런 {survival.remainingRegularForA}회 + 아무 러닝 {survival.remainingTotalForA}회 추가
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-brand-aqua mt-1 shrink-0">•</span>
                        <span>
                          <strong className="text-slate-250 font-bold">개인런 위주:</strong> 아무 러닝 {survival.remainingTotalForB}회 추가
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

      {/* 3. 최근 7일 내 러닝 통계 차트 (Strava Vibe) */}
      <section className="glass-card rounded-3xl p-5 mb-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-brand-neon" />
            <h3 className="text-xs font-black text-white">최근 7일 러닝 통계 (km)</h3>
          </div>
          <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider">My Weekly Activity</span>
        </div>

        {/* Custom SVG responsive graph */}
        <div className="w-full h-32 flex items-end justify-between px-2 pt-4">
          {last7Days.map((day, idx) => {
            const heightPercent = (day.distance / maxChartDist) * 80 // Max height is 80px
            return (
              <div key={idx} className="flex flex-col items-center flex-1 group">
                <span className="text-[8px] text-brand-neon font-black opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-1">
                  {day.distance > 0 ? `${day.distance.toFixed(1)}k` : ''}
                </span>
                <div className="w-6 bg-slate-900/60 border border-white/5 rounded-t-md relative overflow-hidden h-20 flex items-end">
                  <div 
                    className="w-full bg-gradient-to-t from-brand-aqua to-brand-neon rounded-t-md transition-all duration-500"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-black tracking-wider mt-1.5">
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. 나의 획득 배지 (Badges Showcase) */}
      {myBadges.length > 0 && (
        <section className="glass-card rounded-3xl p-5 mb-6 shadow-lg">
          <div className="flex items-center gap-1.5 mb-3">
            <Award className="w-4 h-4 text-brand-neon" />
            <h3 className="text-xs font-black text-white">내가 획득한 러너 배지</h3>
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
          className="glass-card hover:border-brand-neon/40 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group shadow-lg hover:-translate-y-0.5"
        >
          <div className="w-11 h-11 rounded-2xl bg-slate-900/60 text-brand-neon border border-white/5 flex items-center justify-center group-hover:scale-105 group-hover:bg-slate-850 group-hover:shadow-[0_0_15px_rgba(212,255,63,0.15)] transition-all duration-300">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-black tracking-wide text-white mt-1">러닝 기록 인증</span>
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">최소 3km 이상 등록</span>
        </Link>
        
        <Link
          href="/members"
          className="glass-card hover:border-brand-aqua/40 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group shadow-lg hover:-translate-y-0.5"
        >
          <div className="w-11 h-11 rounded-2xl bg-slate-900/60 text-brand-aqua border border-white/5 flex items-center justify-center group-hover:scale-105 group-hover:bg-slate-850 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-300">
            <Trophy className="w-5 h-5" />
          </div>
          <span className="text-xs font-black tracking-wide text-white mt-1">크루원 PB 보드</span>
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">마라톤 3대 기록 경쟁</span>
        </Link>
      </section>

      {/* 6. 실시간 크루 인증 피드 */}
      <section className="flex-1 flex flex-col select-none z-10 relative pb-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">
            실시간 크루 인증 피드
          </span>
          <span className="text-[8px] text-brand-aqua bg-brand-aqua/10 border border-brand-aqua/20 px-2.5 py-0.5 rounded-full font-black tracking-wider">
            5월 총 {records.length}개
          </span>
        </div>

        {records.length === 0 ? (
          <div className="flex-1 min-h-[180px] bg-slate-900/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center p-6 text-slate-400 text-center">
            <span className="text-xs font-bold text-slate-400">📪 이번 달 등록된 러닝 기록이 없습니다.</span>
            <span className="text-[8px] text-slate-500 mt-1.5 uppercase font-black tracking-widest">Start the first run today</span>
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
                  className="glass-card hover:border-white/15 rounded-2xl p-4 flex flex-col shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* 크루원 아바타 */}
                      {rec.user_avatar ? (
                        <div className="relative shrink-0">
                          {rec.is_pacer && (
                            <div className="absolute -inset-0.5 bg-amber-500 rounded-full blur-[1.5px]" />
                          )}
                          <img
                            src={rec.user_avatar}
                            alt="Avatar"
                            className="relative w-9 h-9 rounded-full object-cover border border-white/10"
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-xs shrink-0 shadow-inner text-slate-400">
                          🏃
                        </div>
                      )}

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white">{rec.user_nickname}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border tracking-wide ${
                            rec.type === 'REGULAR'
                              ? 'bg-brand-neon/10 text-brand-neon border-brand-neon/20'
                              : 'bg-slate-900/60 text-slate-400 border-white/5'
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
                            <MapPin className="w-3 h-3 text-slate-550" />
                            {rec.location_name}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3 text-slate-550" />
                            {rec.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 기록 수치 및 삭제 액션 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-brand-aqua bg-brand-aqua/10 border border-brand-aqua/20 px-2.5 py-1 rounded-xl tracking-tight">
                        {rec.distance.toFixed(1)} <span className="text-[8px] text-slate-400 font-bold uppercase">km</span>
                      </span>

                      {isMine && (
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
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
                          className="inline-block text-[8px] font-black px-1.5 py-0.2 rounded bg-slate-900 border border-white/5 text-slate-300"
                          title={badge.name}
                        >
                          {badge.emoji} {badge.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Proof screenshot image if present */}
                  {rec.proof_image_url && (
                    <div className="mt-3.5 rounded-xl overflow-hidden border border-white/5 max-h-48 bg-slate-950/40">
                      <img 
                        src={rec.proof_image_url} 
                        alt="Proof Image" 
                        className="w-full h-full object-cover max-h-48 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          window.open(rec.proof_image_url, '_blank')
                        }}
                      />
                    </div>
                  )}

                  {/* Likes & Comments Social Action Bar */}
                  {(() => {
                    const fireList = rec.reactions?.['🔥'] || []
                    const lightningList = rec.reactions?.['⚡'] || []
                    const clapList = rec.reactions?.['👏'] || []

                    const fireCount = isMock ? fireList.length : (likes.filter(l => l.record_id === rec.id).length + fireList.length)
                    const hasFireReacted = isMock ? fireList.includes(profile.id) : (likes.some(l => l.record_id === rec.id && l.user_id === profile.id) || fireList.includes(profile.id))

                    const lightningCount = lightningList.length
                    const hasLightningReacted = lightningList.includes(profile.id)

                    const clapCount = clapList.length
                    const hasClapReacted = clapList.includes(profile.id)

                    return (
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 text-[10px] font-black text-slate-400">
                        {/* 🔥 리액션 */}
                        <button 
                          onClick={(e) => handleToggleReaction(e, rec.id, '🔥')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 border border-white/5 rounded-xl hover:text-red-400 cursor-pointer transition-all active:scale-95 select-none ${hasFireReacted ? 'text-red-400 bg-red-950/15 border-red-900/30 shadow-[0_0_8px_rgba(239,68,68,0.1)]' : ''}`}
                        >
                          <span>🔥</span>
                          <span>{fireCount}</span>
                        </button>

                        {/* ⚡ 리액션 */}
                        <button 
                          onClick={(e) => handleToggleReaction(e, rec.id, '⚡')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 border border-white/5 rounded-xl hover:text-brand-aqua cursor-pointer transition-all active:scale-95 select-none ${hasLightningReacted ? 'text-brand-aqua bg-brand-aqua/10 border-brand-aqua/20 shadow-[0_0_8px_rgba(6,182,212,0.1)]' : ''}`}
                        >
                          <span>⚡</span>
                          <span>{lightningCount}</span>
                        </button>

                        {/* 👏 리액션 */}
                        <button 
                          onClick={(e) => handleToggleReaction(e, rec.id, '👏')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 border border-white/5 rounded-xl hover:text-brand-neon cursor-pointer transition-all active:scale-95 select-none ${hasClapReacted ? 'text-brand-neon bg-brand-neon/10 border-brand-neon/20 shadow-[0_0_8px_rgba(212,255,63,0.1)]' : ''}`}
                        >
                          <span>👏</span>
                          <span>{clapCount}</span>
                        </button>

                        {/* 댓글 토글 버튼 */}
                        <button 
                          onClick={() => setActiveCommentRecordId(activeCommentRecordId === rec.id ? null : rec.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 border border-white/5 rounded-xl hover:text-brand-aqua cursor-pointer transition-all select-none ml-auto ${activeCommentRecordId === rec.id ? 'text-brand-aqua bg-brand-aqua/10 border-brand-aqua/20 shadow-[0_0_8px_rgba(6,182,212,0.1)]' : ''}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{feedComments.length}</span>
                        </button>
                      </div>
                    )
                  })()}

                  {/* Comments Drawer/Box */}
                  {activeCommentRecordId === rec.id && (
                    <div className="mt-3 bg-slate-950/40 border border-white/5 p-3 rounded-2xl animate-fadeIn space-y-3">
                      {feedComments.length === 0 ? (
                        <p className="text-[9px] text-slate-500 font-bold text-center py-2">아직 댓글이 없습니다. 첫 소통을 남겨보세요! 💬</p>
                      ) : (
                        <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                          {feedComments.map((cmt) => (
                            <div key={cmt.id} className="flex gap-2 items-start text-[10px]">
                              {cmt.user_avatar ? (
                                <img src={cmt.user_avatar} className="w-6 h-6 rounded-full object-cover border border-white/10 mt-0.5 shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[8px] mt-0.5 shrink-0 text-slate-400">🏃</div>
                              )}
                              <div className="flex-1 bg-slate-900/60 border border-white/5 p-2 rounded-xl">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-black text-white">{cmt.user_nickname}</span>
                                  {(cmt.user_id === profile.id || profile.role === 'ADMIN') && (
                                    <button 
                                      onClick={() => handleDeleteComment(rec.id, cmt.id)}
                                      className="text-slate-500 hover:text-rose-400 text-[8px] font-black cursor-pointer"
                                    >
                                      삭제
                                    </button>
                                  )}
                                </div>
                                <p className="text-slate-300 font-bold leading-relaxed">{cmt.comment_text}</p>
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
                          className="flex-1 h-9 bg-slate-900/60 border border-white/10 focus:border-brand-neon rounded-xl px-3 text-[10px] font-bold outline-none text-white placeholder-slate-500"
                        />
                        <button
                          type="submit"
                          className="w-9 h-9 rounded-xl bg-brand-neon text-slate-900 flex items-center justify-center hover:bg-brand-neon/90 cursor-pointer shadow-sm shrink-0"
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
        )}
      </section>
    </div>
  )
}
