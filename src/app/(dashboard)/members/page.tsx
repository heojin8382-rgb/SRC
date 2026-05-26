'use client'

import { useState, useEffect } from 'react'
import { mockStore, Profile, Member } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Shield } from 'lucide-react'

type Category = '10K' | 'Half' | 'Full'

export default function MembersPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [activeCategory, setActiveCategory] = useState<Category>('10K')

  // 어드민 제어판 관리 전용 아코디언 상태
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const isMock = checkIsMock()
    if (isMock) {
      setProfile(mockStore.getProfile())
      setMembers(mockStore.getMembers())
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

      // Map profiles and their PBs
      const pbsByUserId = (pbsList || []).reduce<Record<string, Record<string, string>>>((acc, pb: any) => {
        if (!acc[pb.user_id]) acc[pb.user_id] = {}
        acc[pb.user_id][pb.category] = pb.record_time
        return acc;
      }, {})

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

  return (
    <div className="p-5 flex flex-col min-h-screen relative overflow-hidden select-none">
      {/* 배경 은은한 광원 효과 */}
      <div className="absolute top-[-10%] left-[-15%] w-[70%] h-[40%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-15%] w-[60%] h-[45%] bg-emerald-500/3 rounded-full blur-[100px] pointer-events-none" />

      {/* 타이틀 헤더 */}
      <header className="flex items-center justify-between mb-6 z-10 relative">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#2563EB] animate-pulse" />
          <h1 className="text-base font-black tracking-tight text-slate-900">크루원 PB 보드</h1>
        </div>
        <span className="text-[9px] text-slate-500 font-extrabold tracking-widest uppercase">
          Personal Best
        </span>
      </header>

      {/* 👑 A. ADMIN/운영진 전용 회원 승인 & 상태 제어 보드 */}
      {(profile.role === 'ADMIN' || profile.can_view_admin) && (
        <section className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 mb-6 shadow-sm z-10 relative overflow-hidden">
          <div className="absolute top-[-30%] left-[-20%] w-[120px] h-[120px] bg-blue-500/5 rounded-full blur-[30px]" />
          
          <button
            onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2563EB] animate-pulse" />
              <h2 className="text-xs font-black tracking-widest text-[#2563EB] uppercase">
                운영진 전용 크루 권한 제어판
              </h2>
            </div>
            <span className="text-[10px] text-[#2563EB] font-black">{isAdminPanelOpen ? '접기 ▲' : '열기 ▼'}</span>
          </button>

          {isAdminPanelOpen && (
            <div className="mt-4 space-y-3.5 border-t border-slate-200 pt-4">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                운영진 권한이 감지되어 아래 크루 멤버 가입 승인(`WAITING` ➔ `REGULAR`), 면제권 부여, 차단 처리를 관리할 수 있습니다. {! (profile.role === 'ADMIN' || profile.can_edit_admin) && <span className="text-rose-600 font-extrabold">(현재 조회 전용 권한입니다)</span>}
              </p>

              {members.map(m => {
                const isMe = m.id === profile.id

                return (
                  <div 
                    key={m.id} 
                    className="p-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl flex flex-col gap-3 shadow-inner"
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
                                  ? 'bg-[#2563EB] text-white border-[#2563EB] hover:bg-[#2563EB]/90 shadow-[0_0_10px_rgba(37,99,235,0.15)]'
                                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300')
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
                                  ? 'bg-cyan-50 text-cyan-600 border-cyan-200'
                                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300')
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
                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300')
                          }`}
                        >
                          {m.is_active ? '🚫 회원정지' : '✅ 정지해제'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

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
          <span className="text-[10px] text-slate-500 tracking-widest font-black uppercase">RANKING BOARD</span>
          <span className="text-[9px] text-[#2563EB] bg-[#2563EB]/5 border border-[#2563EB]/15 px-2.5 py-0.5 rounded-full font-black tracking-wider">
            기록 보유 {rankedMembers.length}명
          </span>
        </div>

        {rankedMembers.length === 0 ? (
          <div className="flex-1 min-h-[220px] bg-white/80 border border-slate-200/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-400">
            <span className="text-sm">📪 해당 종목에 등록된 PB 기록이 없습니다.</span>
            <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">Update PB in my profile page</span>
          </div>
        ) : (
          <div className="space-y-3">
            {rankedMembers.map((m, index) => {
              const rank = index + 1
              
              // 상위 3인 메달 데코레이션 스타일
              const rankDecor: Record<number, { label: string; bg: string; text: string; border: string }> = {
                1: { label: '🥇 1st', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
                2: { label: '🥈 2nd', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
                3: { label: '🥉 3rd', bg: 'bg-amber-100/50', text: 'text-amber-700', border: 'border-amber-200' },
              }

              const decor = rankDecor[rank]

              return (
                <div
                  key={m.id}
                  className={`bg-white/85 backdrop-blur-md border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all duration-300 hover:bg-white/95 ${
                    decor ? `border-2 ${decor.border} shadow-[0_0_15px_rgba(251,191,36,0.06)]` : 'border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* 순위 마킹 */}
                    <div className="w-11 flex items-center justify-center shrink-0">
                      {decor ? (
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${decor.bg} ${decor.text} border ${decor.border}`}>
                          {decor.label}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-400">{rank}위</span>
                      )}
                    </div>

                    {/* 아바타 */}
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-400 shadow-inner">👤</div>
                    )}

                    {/* 이름 & 역할 및 페이서 풍선 */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{m.nickname}</span>
                        {/* 페이서 전용 🎈 표시 */}
                        {m.role === 'PACER' && <span className="text-xs" title="크루 페이서 🎈">🎈</span>}
                        {m.role === 'ADMIN' && <span className="text-[9px]" title="크루 운영자 ⚡">⚡</span>}
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{activeCategory} 최고 기록</span>
                    </div>
                  </div>

                  {/* PB 타임 레코드 */}
                  <span className="text-xs font-black tracking-wider text-[#2563EB] bg-[#2563EB]/5 border border-[#2563EB]/15 px-3.5 py-1 rounded-xl">
                    {m.pbTime}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
