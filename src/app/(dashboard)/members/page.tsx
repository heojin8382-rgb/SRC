'use client'

import { useState, useEffect } from 'react'
import { mockStore, Profile, Member, RunningRecord } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Shield, Award, ChevronDown, Search } from 'lucide-react'
import { getBadgesForUser } from '@/lib/utils/badges'

type Category = '10K' | 'Half' | 'Full'

export default function MembersPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [activeCategory, setActiveCategory] = useState<Category>('10K')
  
  // All records list to calculate badges
  const [allRecords, setAllRecords] = useState<RunningRecord[]>([])
  const [hasPbsMap, setHasPbsMap] = useState<Record<string, boolean>>({})

  // 어드민 제어판 관리 전용 아코디언 상태
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)

  // 랭킹보드 아코디언 상태
  const [isRankingOpen, setIsRankingOpen] = useState(false)
  const [adminSearchTerm, setAdminSearchTerm] = useState('')
  const [rankingSearchTerm, setRankingSearchTerm] = useState('')
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [selectedBracket, setSelectedBracket] = useState<{ key: string; gender: '남' | '여' } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const isMock = checkIsMock()
    if (isMock) {
      setProfile(mockStore.getProfile())
      setMembers(mockStore.getMembers())
      setAllRecords(mockStore.getRunningRecords())

      // Mock PBs mapping
      const pbsMapping: Record<string, boolean> = {}
      mockStore.getMembers().forEach(m => {
        pbsMapping[m.id] = Object.keys(m.pbs || {}).length > 0
      })
      setHasPbsMap(pbsMapping)
    } else {
      const supabase = createClient()
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: activeProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (!activeProfile) return
      setProfile(activeProfile as Profile)

      // Fetch all profiles
      const { data: profilesList } = await supabase
        .from('profiles')
        .select('*')

      // Fetch all PBs
      const { data: pbsList } = await supabase
        .from('marathon_pbs')
        .select('*')

      // Fetch all running records to calculate badges and location stats
      const { data: recordsList } = await supabase
        .from('running_records')
        .select('user_id, distance, is_pacer, location_name')

      const formattedRecords: RunningRecord[] = (recordsList || []).map((r: any) => ({
        id: '',
        user_id: r.user_id,
        user_nickname: '',
        user_avatar: '',
        distance: Number(r.distance),
        location_id: '',
        location_name: r.location_name || '',
        date: '',
        type: 'PERSONAL',
        is_pacer: r.is_pacer
      }))
      setAllRecords(formattedRecords)

      // Map profiles and their PBs
      const pbsByUserId = (pbsList || []).reduce<Record<string, Record<string, string>>>((acc, pb: any) => {
        if (!acc[pb.user_id]) acc[pb.user_id] = {}
        acc[pb.user_id][pb.category] = pb.record_time
        return acc;
      }, {})

      const pbsMapping: Record<string, boolean> = {}
      if (pbsList) {
        pbsList.forEach((pb: any) => {
          pbsMapping[pb.user_id] = true
        })
      }
      setHasPbsMap(pbsMapping)

      const mappedMembers: Member[] = (profilesList || []).map((p: any) => ({
        id: p.id,
        nickname: p.nickname || '신규 크루원',
        real_name: p.real_name || '',
        birth_year: p.birth_year || 0,
        gender: p.gender || '',
        avatar_url: p.avatar_url || '',
        role: p.role,
        is_active: p.is_active,
        is_exempted: p.is_exempted,
        is_onboarded: p.is_onboarded,
        show_pb: p.show_pb ?? true,
        can_view_admin: p.can_view_admin ?? false,
        can_edit_admin: p.can_edit_admin ?? false,
        pbs: pbsByUserId[p.id] || {}
      }))

      setMembers(mappedMembers)
    }
  }

  // 1. 역할군 토글 승인 핸들러
  const handleToggleRole = async (memberId: string, currentRole: Member['role']) => {
    if (!profile || (profile.role !== 'ADMIN' && !profile.can_edit_admin)) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
    const nextRole = currentRole === 'WAITING' ? 'REGULAR' : 'WAITING'
    const isMock = checkIsMock()
    if (isMock) {
      mockStore.updateMemberRole(memberId, nextRole)
      loadData()
    } else {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', memberId)
      if (error) {
        alert('역할 변경에 실패했습니다.')
      } else {
        loadData()
      }
    }
  }

  // 2. 부상 면제 토글 핸들러
  const handleToggleExempted = async (memberId: string, currentExempted: boolean) => {
    if (!profile || (profile.role !== 'ADMIN' && !profile.can_edit_admin)) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
    const isMock = checkIsMock()
    if (isMock) {
      mockStore.updateMemberExempted(memberId, !currentExempted)
      loadData()
    } else {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ is_exempted: !currentExempted })
        .eq('id', memberId)
      if (error) {
        alert('면제 상태 변경에 실패했습니다.')
      } else {
        loadData()
      }
    }
  }

  // 3. 계정 활성화 토글 핸들러
  const handleToggleActive = async (memberId: string, currentActive: boolean) => {
    if (!profile || (profile.role !== 'ADMIN' && !profile.can_edit_admin)) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
    const isMock = checkIsMock()
    if (isMock) {
      mockStore.updateMemberActive(memberId, !currentActive)
      loadData()
    } else {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentActive })
        .eq('id', memberId)
      if (error) {
        alert('계정 활성화 상태 변경에 실패했습니다.')
      } else {
        loadData()
      }
    }
  }

  if (!profile) return null

  // 활성 장소 및 기록 필터링: 선택된 종목(10K/Half/Full) 기록이 있고 show_pb가 true인 회원만 소팅
  const rankedMembers = members
    .filter(m => m.is_active && (m.show_pb ?? true) && m.pbs && m.pbs[activeCategory])
    .map(m => ({
      ...m,
      pbTime: m.pbs[activeCategory] as string
    }))
    // 기록 시간순 오름차순 정렬 (00:30:00 이 00:45:00 보다 빠름)
    .sort((a, b) => a.pbTime.localeCompare(b.pbTime))

  const filteredAdminMembers = members.filter(m =>
    m.nickname.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    (m.real_name && m.real_name.toLowerCase().includes(adminSearchTerm.toLowerCase()))
  )

  const filteredRankedMembers = rankedMembers.filter(m =>
    m.nickname.toLowerCase().includes(rankingSearchTerm.toLowerCase()) ||
    (m.real_name && m.real_name.toLowerCase().includes(rankingSearchTerm.toLowerCase()))
  )

  // 풀 마라톤 성적 구간별 인원 산출 (통계용)
  const fullPbMembers = members.filter(m => m.pbs && m.pbs['Full'])
  let sub3M = 0, sub3W = 0
  let singleM = 0, singleW = 0
  let pb330M = 0, pb330W = 0
  let sub4M = 0, sub4W = 0
  let sub5M = 0, sub5W = 0
  let over5M = 0, over5W = 0

  fullPbMembers.forEach(m => {
    const t = m.pbs['Full']
    const gender = m.gender || '남'
    if (!t) return

    const parts = t.split(':').map(Number)
    const totalSec = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)

    if (totalSec < 3 * 3600) {
      if (gender === '여') sub3W++; else sub3M++;
    } else if (totalSec < 3 * 3600 + 10 * 60) {
      if (gender === '여') singleW++; else singleM++;
    } else if (totalSec < 3 * 3600 + 30 * 60) {
      if (gender === '여') pb330W++; else pb330M++;
    } else if (totalSec < 4 * 3600) {
      if (gender === '여') sub4W++; else sub4M++;
    } else if (totalSec < 5 * 3600) {
      if (gender === '여') sub5W++; else sub5M++;
    } else {
      if (gender === '여') over5W++; else over5M++;
    }
  })

  // 최다 활동 장소 통계 산출
  const locationCounts: Record<string, number> = {}
  allRecords.forEach(r => {
    if (r.location_name) {
      const locName = r.location_name.trim()
      if (locName) {
        locationCounts[locName] = (locationCounts[locName] || 0) + 1
      }
    }
  })
  const topLocations = Object.entries(locationCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 풀코스 구간별 멤버 필터링
  const getBracketMembers = (key: string, gender: '남' | '여') => {
    return fullPbMembers.filter(m => {
      const g = m.gender === '여' ? '여' : '남'
      if (g !== gender) return false
      
      const t = m.pbs['Full']
      if (!t) return false

      const parts = t.split(':').map(Number)
      const totalSec = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)

      if (key === 'sub-3') return totalSec < 3 * 3600
      if (key === 'single') return totalSec >= 3 * 3600 && totalSec < 3 * 3600 + 10 * 60
      if (key === '330') return totalSec >= 3 * 3600 + 10 * 60 && totalSec < 3 * 3600 + 30 * 60
      if (key === 'sub-4') return totalSec >= 3 * 3600 + 30 * 60 && totalSec < 4 * 3600
      if (key === 'sub-5') return totalSec >= 4 * 3600 && totalSec < 5 * 3600
      return false
    })
  }

  const toggleBracketSelection = (key: string, gender: '남' | '여') => {
    if (selectedBracket?.key === key && selectedBracket?.gender === gender) {
      setSelectedBracket(null)
    } else {
      setSelectedBracket({ key, gender })
    }
  }

  return (
    <div className="p-5 flex flex-col min-h-screen relative overflow-hidden select-none bg-white">
      


      {/* 타이틀 헤더 */}
      <header className="flex items-center justify-between mb-6 z-10 relative">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#2563EB]" />
          <h1 className="text-base font-black tracking-tight text-slate-800">크루원 PB 보드</h1>
        </div>
        <span className="text-[9px] text-slate-500 font-extrabold tracking-widest uppercase">
          Personal Best
        </span>
      </header>

      {/* 👑 A. ADMIN/운영진 전용 회원 승인 & 상태 제어 보드 */}
      {(profile.role === 'ADMIN' || profile.can_view_admin) && (
        <section className="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-6 shadow-sm z-10 relative overflow-hidden">
          <button
            onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-xs font-black tracking-widest text-[#2563EB] uppercase">
                운영진 전용 크루 권한 제어판
              </h2>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#2563EB] transition-transform duration-300 ${isAdminPanelOpen ? 'rotate-180' : ''}`} />
          </button>

          {isAdminPanelOpen && (
            <div className="mt-4 space-y-3.5 border-t border-slate-200 pt-4">
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                운영진 권한이 감지되어 아래 크루 멤버 가입 승인(`WAITING` ➔ `REGULAR`), 면제권 부여, 차단 처리를 관리할 수 있습니다. {! (profile.role === 'ADMIN' || profile.can_edit_admin) && <span className="text-rose-600 font-extrabold">(현재 조회 전용 권한입니다)</span>}
              </p>

              {/* 검색 바 */}
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="이름/닉네임으로 멤버 검색..."
                  value={adminSearchTerm}
                  onChange={(e) => setAdminSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#2563EB] transition-all text-slate-800 font-semibold"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                {adminSearchTerm && (
                  <button
                    onClick={() => setAdminSearchTerm('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 font-extrabold text-[10px] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {filteredAdminMembers.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-6">검색 결과가 없습니다.</p>
              ) : (
                filteredAdminMembers.map(m => {
                  const isMe = m.id === profile.id

                  return (
                  <div 
                    key={m.id} 
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs border border-slate-200">👤</div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">{m.nickname} {isMe && '(나)'}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">역할: {m.role} / 상태: {m.is_active ? '정상' : '정지'}</span>
                        </div>
                      </div>

                      {/* 면제 배지 */}
                      {m.is_exempted && (
                        <span className="text-[8px] font-black tracking-wider bg-cyan-50 text-cyan-600 border border-cyan-200 px-2 py-0.5 rounded-full">
                          🩹 면제
                        </span>
                      )}
                    </div>

                    {!isMe && (
                      <div className="grid grid-cols-3 gap-2">
                        {/* 승인 토글 */}
                        <button
                          disabled={!(profile.role === 'ADMIN' || profile.can_edit_admin)}
                          onClick={() => handleToggleRole(m.id, m.role)}
                          className={`py-2 rounded-xl text-[9px] font-black tracking-wider uppercase border transition-all duration-200 ${
                            !(profile.role === 'ADMIN' || profile.can_edit_admin)
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                              : 'cursor-pointer ' + (m.role === 'WAITING'
                                  ? 'bg-[#2563EB] text-white border-[#2563EB] hover:bg-[#2563EB]/90 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-350')
                          }`}
                        >
                          {m.role === 'WAITING' ? '👍 가입승인' : '⏳ 대기전환'}
                        </button>

                        {/* 부상면제 토글 */}
                        <button
                          disabled={!(profile.role === 'ADMIN' || profile.can_edit_admin)}
                          onClick={() => handleToggleExempted(m.id, m.is_exempted)}
                          className={`py-2 rounded-xl text-[9px] font-black tracking-wider uppercase border transition-all duration-200 ${
                            !(profile.role === 'ADMIN' || profile.can_edit_admin)
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                              : 'cursor-pointer ' + (m.is_exempted
                                  ? 'bg-cyan-50 text-cyan-650 border-cyan-250 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-350')
                          }`}
                        >
                          {m.is_exempted ? '🩹 면제해제' : '🩹 부상면제'}
                        </button>

                        {/* 강퇴/활성 토글 */}
                        <button
                          disabled={!(profile.role === 'ADMIN' || profile.can_edit_admin)}
                          onClick={() => handleToggleActive(m.id, m.is_active)}
                          className={`py-2 rounded-xl text-[9px] font-black tracking-wider uppercase border transition-all duration-200 ${
                            !(profile.role === 'ADMIN' || profile.can_edit_admin)
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                              : 'cursor-pointer ' + (!m.is_active
                                  ? 'bg-rose-50 text-rose-650 border-rose-250 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-350')
                          }`}
                        >
                          {m.is_active ? '🚫 회원정지' : '✅ 정지해제'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              }))}
            </div>
          )}
        </section>
      )}

      {/* 📊 B. 크루 활동 및 PB 통계 브리핑 (Collapsible) */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 mb-6 shadow-sm z-10 relative">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsStatsOpen(!isStatsOpen)}
            className="w-full flex items-center justify-between text-xs font-black text-slate-800 hover:text-slate-700 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[#2563EB]">📊</span>
              <span>크루 활동 및 PB 통계 브리핑</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isStatsOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isStatsOpen && (
          <div className="mt-4 pt-4 border-t border-slate-150 space-y-5 animate-fadeIn">
            {/* 1. 풀코스 구간별 현황 */}
            <div className="space-y-2">
              <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">🏆 풀 마라톤 명예의 전당</h4>
              
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: 'sub-3', label: 'Sub-3 (3시간 미만) ⚡', m: sub3M, w: sub3W, color: 'border-blue-200 bg-blue-50/20 text-blue-700' },
                  { key: 'single', label: '싱글 (3시간 ~ 3시간 10분) 🥇', m: singleM, w: singleW, color: 'border-amber-250 bg-amber-50/20 text-amber-700' },
                  { key: '330', label: '330 (3시간 10분 ~ 3시간 30분) 🥈', m: pb330M, w: pb330W, color: 'border-slate-250 bg-slate-50/30 text-slate-700' },
                  { key: 'sub-4', label: 'Sub-4 (3시간 30분 ~ 4시간) 🥉', m: sub4M, w: sub4W, color: 'border-amber-200 bg-amber-50/10 text-amber-800' },
                  { key: 'sub-5', label: 'Sub-5 (4시간 ~ 5시간) 🏃', m: sub5M, w: sub5W, color: 'border-slate-200 bg-slate-50/10 text-slate-600' },
                ].map((item, idx) => {
                  const isSelectedM = selectedBracket?.key === item.key && selectedBracket?.gender === '남'
                  const isSelectedW = selectedBracket?.key === item.key && selectedBracket?.gender === '여'
                  const currentSelected = selectedBracket?.key === item.key ? selectedBracket?.gender : null

                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className={`p-2.5 border rounded-xl flex items-center justify-between text-[10px] font-black ${item.color}`}>
                        <span>{item.label}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleBracketSelection(item.key, '남')}
                            className={`px-2 py-0.5 rounded-md border transition-all duration-200 flex items-center gap-0.5 cursor-pointer ${
                              isSelectedM 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-extrabold'
                                : 'bg-white/60 hover:bg-white border-slate-200/50 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span>🏃‍♂️ 남 {item.m}명</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBracketSelection(item.key, '여')}
                            className={`px-2 py-0.5 rounded-md border transition-all duration-200 flex items-center gap-0.5 cursor-pointer ${
                              isSelectedW 
                                ? 'bg-rose-500 border-rose-500 text-white shadow-sm font-extrabold'
                                : 'bg-white/60 hover:bg-white border-slate-200/50 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span>🏃‍♀️ 여 {item.w}명</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* 펼쳐지는 이름 리스트 */}
                      {currentSelected && selectedBracket?.key === item.key && (
                        <div className="mx-1 px-3 py-2 bg-slate-50 border border-slate-200/70 rounded-xl animate-fadeIn space-y-1">
                          <div className="text-[9px] text-slate-400 font-extrabold flex justify-between items-center">
                            <span>{currentSelected === '남' ? '🏃‍♂️ 남성 주자 목록' : '🏃‍♀️ 여성 주자 목록'}</span>
                            <button 
                              type="button"
                              onClick={() => setSelectedBracket(null)}
                              className="text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer"
                            >
                              ✕ 닫기
                            </button>
                          </div>
                          {getBracketMembers(item.key, currentSelected).length === 0 ? (
                            <p className="text-[10px] text-slate-400 py-1">해당되는 크루원이 없습니다.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {getBracketMembers(item.key, currentSelected).map((m) => (
                                <span 
                                  key={m.id} 
                                  className="inline-flex items-center gap-1 bg-white border border-slate-200 text-[10px] font-bold text-slate-800 px-2 py-0.5 rounded-lg shadow-sm"
                                >
                                  {m.avatar_url ? (
                                    <img src={m.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                                  ) : (
                                    <span className="text-[8px]">👤</span>
                                  )}
                                  <span>{m.nickname}</span>
                                  {m.real_name && <span className="text-slate-400 text-[9px] font-normal">({m.real_name})</span>}
                                  <span className="text-[#2563EB] font-black text-[9px] ml-0.5">{m.pbs['Full']}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. 최다 활동 장소 TOP 5 */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">📍 크루 최다 러닝 장소 (Top 5)</h4>
              
              {topLocations.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-4">등록된 러닝 인증 기록이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {topLocations.map((loc, idx) => {
                    const maxCount = topLocations[0].count || 1
                    const widthPercent = Math.round((loc.count / maxCount) * 100)
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-700">
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400 font-bold">{idx + 1}.</span>
                            <span>{loc.name}</span>
                          </span>
                          <span className="text-slate-550">{loc.count}회</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 2. 카테고리 3대 종목 선택 세그먼트 */}
      <section className="bg-slate-100 border border-slate-200 p-1.5 rounded-2xl grid grid-cols-3 gap-1.5 mb-6 shadow-inner z-10 relative">
        {(['10K', 'Half', 'Full'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`py-2.5 rounded-xl text-xs font-black tracking-widest transition-all duration-300 cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* 3. 랭킹 순위 리스트 */}
      <section className="flex-1 flex flex-col z-10 relative">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setIsRankingOpen(!isRankingOpen)}
            className="w-full flex items-center justify-between text-[10px] text-slate-555 hover:text-slate-700 tracking-widest font-black uppercase cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>RANKING BOARD</span>
              <span className="text-[9px] text-[#2563EB] bg-[#2563EB]/5 border border-[#2563EB]/15 px-2.5 py-0.5 rounded-full font-black tracking-wider normal-case">
                기록 보유 {rankedMembers.length}명
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isRankingOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isRankingOpen && (
          <>
            {/* 검색 바 */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="이름/닉네임으로 기록 검색..."
                value={rankingSearchTerm}
                onChange={(e) => setRankingSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#2563EB] focus:bg-white transition-all text-slate-800 font-semibold"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              {rankingSearchTerm && (
                <button
                  onClick={() => setRankingSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 font-extrabold text-[10px] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {filteredRankedMembers.length === 0 ? (
              <div className="flex-1 min-h-[220px] bg-slate-50 border border-slate-250 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-400">
                <span className="text-xs font-black text-slate-600">
                  {rankedMembers.length === 0 ? "📪 해당 종목에 등록된 PB 기록이 없습니다." : "🔍 검색 결과가 없습니다."}
                </span>
                {rankedMembers.length === 0 && (
                  <span className="text-[9px] text-slate-455 mt-2 font-bold uppercase tracking-widest">Update PB in my profile page</span>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredRankedMembers.map((m, index) => {
                  const rank = index + 1
                  
                  // 상위 3인 메달 데코레이션 스타일
                  const rankDecor: Record<number, { label: string; bg: string; text: string; border: string }> = {
                    1: { label: '🥇 1st', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-250' },
                    2: { label: '🥈 2nd', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-250' },
                    3: { label: '🥉 3rd', bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-200' },
                  }

                  const decor = rankDecor[rank]

                  // Calculate runner badges dynamically
                  const runnerRecords = allRecords.filter(r => r.user_id === m.id)
                  const runnerBadges = getBadgesForUser(runnerRecords, hasPbsMap[m.id] || false)

                  return (
                    <div
                      key={m.id}
                      className={`bg-white border rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm transition-all duration-300 hover:bg-slate-50/30 ${
                        decor ? `border-2 ${decor.border} shadow-sm` : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* 순위 마킹 */}
                          <div className="w-11 flex items-center justify-center shrink-0">
                            {decor ? (
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${decor.bg} ${decor.text} border ${decor.border}`}>
                                {decor.label}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-slate-400">{rank}위</span>
                            )}
                          </div>

                          {/* 아바타 */}
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-400 shadow-inner shrink-0">👤</div>
                          )}

                          {/* 이름 & 역할 및 페이서 풍선 */}
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900">{m.nickname}</span>
                              {m.role === 'PACER' && <span className="text-xs" title="크루 페이서 🎈">🎈</span>}
                              {m.role === 'ADMIN' && <span className="text-[9px]" title="크루 운영자 ⚡">⚡</span>}
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{activeCategory} 최고 기록</span>
                          </div>
                        </div>

                        {/* PB 타임 레코드 */}
                        <span className="text-xs font-black tracking-wider text-[#2563EB] bg-blue-50 border border-blue-100 px-3.5 py-1 rounded-xl">
                          {m.pbTime}
                        </span>
                      </div>

                      {/* Runner's Badges Grid inside card */}
                      {runnerBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-14">
                          {runnerBadges.map(badge => (
                            <span 
                              key={badge.id}
                              className="inline-block text-[8px] font-black px-1.5 py-0.2 rounded bg-slate-50 border border-slate-200 text-slate-655"
                              title={badge.name}
                            >
                              {badge.emoji} {badge.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
