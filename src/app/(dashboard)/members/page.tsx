'use client'

import { useState, useEffect } from 'react'
import { mockStore, Profile, Member } from '@/lib/mockStore'
import { Trophy, Shield, UserCheck, Flame, Star, Sparkles } from 'lucide-react'

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

  const loadData = () => {
    setProfile(mockStore.getProfile())
    setMembers(mockStore.getMembers())
  }

  // 1. 역할군 토글 승인 핸들러
  const handleToggleRole = (memberId: string, currentRole: Member['role']) => {
    const nextRole = currentRole === 'WAITING' ? 'REGULAR' : 'WAITING'
    mockStore.updateMemberRole(memberId, nextRole)
    loadData()
  }

  // 2. 부상 면제 토글 핸들러
  const handleToggleExempted = (memberId: string, currentExempted: boolean) => {
    mockStore.updateMemberExempted(memberId, !currentExempted)
    loadData()
  }

  // 3. 계정 활성화 토글 핸들러
  const handleToggleActive = (memberId: string, currentActive: boolean) => {
    mockStore.updateMemberActive(memberId, !currentActive)
    loadData()
  }

  if (!profile) return null

  // 활성 장소 및 기록 필터링: 선택된 종목(10K/Half/Full) 기록이 있는 회원만 소팅
  const rankedMembers = members
    .filter(m => m.is_active && m.pbs && m.pbs[activeCategory])
    .map(m => ({
      ...m,
      pbTime: m.pbs[activeCategory] as string
    }))
    // 기록 시간순 오름차순 정렬 (00:30:00 이 00:45:00 보다 빠름)
    .sort((a, b) => a.pbTime.localeCompare(b.pbTime))

  return (
    <div className="p-5 flex flex-col min-h-screen select-none">
      
      {/* 타이틀 헤더 */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400 fill-amber-500/10 animate-bounce-slow" />
          <h1 className="text-lg font-black tracking-wide text-white">크루원 PB 보드</h1>
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          Personal Best
        </span>
      </header>

      {/* 👑 A. [요구사항 반영] ADMIN 전용 회원 승인 & 상태 제어 보드 */}
      {profile.role === 'ADMIN' && (
        <section className="bg-slate-900/60 border border-[#D4FF3F]/20 rounded-3xl p-5 mb-6 shadow-md animate-scaleUp relative overflow-hidden">
          <div className="absolute top-[-30%] left-[-20%] w-[120px] h-[120px] bg-[#D4FF3F]/5 rounded-full blur-[30px]" />
          
          <button
            onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4FF3F] animate-pulse" />
              <h2 className="text-xs font-black tracking-widest text-[#D4FF3F] uppercase">
                어드민 전용 크루 권한 제어판
              </h2>
            </div>
            <span className="text-xs text-[#D4FF3F] font-black">{isAdminPanelOpen ? '접기 ▲' : '열기 ▼'}</span>
          </button>

          {isAdminPanelOpen && (
            <div className="mt-5 space-y-4 border-t border-slate-850 pt-4">
              <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                운영자 권한이 감지되어 아래 크루 멤버 가입 승인(`WAITING` ➔ `REGULAR`), 면제권 부여, 차단 처리를 직접 통제할 수 있습니다.
              </p>

              {members.map(m => {
                // 내 정보는 조작 비활성
                const isMe = m.id === profile.id

                return (
                  <div 
                    key={m.id} 
                    className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs">👤</div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-white">{m.nickname} {isMe && '(나)'}</span>
                          <span className="text-[9px] text-slate-500">역할: {m.role} / 활성상태: {m.is_active ? '정상' : '정지'}</span>
                        </div>
                      </div>

                      {/* 면제 배지 */}
                      {m.is_exempted && (
                        <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded-full">
                          🩹 면제
                        </span>
                      )}
                    </div>

                    {!isMe && (
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {/* 승인 토글 */}
                        <button
                          onClick={() => handleToggleRole(m.id, m.role)}
                          className={`py-1.5 rounded-lg text-[9px] font-black tracking-wide border cursor-pointer transition-all ${
                            m.role === 'WAITING'
                              ? 'bg-[#D4FF3F] text-[#0B0F19] border-[#D4FF3F] hover:bg-[#D4FF3F]/90'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {m.role === 'WAITING' ? '👍 가입승인' : '⏳ 대기전환'}
                        </button>

                        {/* 부상면제 토글 */}
                        <button
                          onClick={() => handleToggleExempted(m.id, m.is_exempted)}
                          className={`py-1.5 rounded-lg text-[9px] font-black tracking-wide border cursor-pointer transition-all ${
                            m.is_exempted
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-450 hover:border-slate-700'
                          }`}
                        >
                          {m.is_exempted ? '🩹 면제해제' : '🩹 부상면제'}
                        </button>

                        {/* 강퇴/활성 토글 */}
                        <button
                          onClick={() => handleToggleActive(m.id, m.is_active)}
                          className={`py-1.5 rounded-lg text-[9px] font-black tracking-wide border cursor-pointer transition-all ${
                            !m.is_active
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-450 hover:border-slate-700'
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
      <section className="bg-slate-950/80 border border-slate-850 p-1.5 rounded-2xl grid grid-cols-3 gap-1 mb-6 shadow-inner">
        {(['10K', 'Half', 'Full'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`py-2 rounded-xl text-xs font-black tracking-wider transition-all duration-300 cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#D4FF3F] text-[#0B0F19] shadow-md font-black'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* 3. 랭킹 순위 리스트 */}
      <section className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] text-slate-500 tracking-wider font-bold">RANKING BOARD</span>
          <span className="text-[10px] text-[#D4FF3F] font-bold">기록 보유 {rankedMembers.length}명</span>
        </div>

        {rankedMembers.length === 0 ? (
          <div className="flex-1 min-h-[220px] bg-[#1E293B]/20 border border-slate-850 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-500">
            <span className="text-sm">📪 해당 종목에 등록된 PB 기록이 없습니다.</span>
            <span className="text-[10px] text-slate-600 mt-1">마이페이지에서 내 PB 기록을 먼저 추가해 보세요!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {rankedMembers.map((m, index) => {
              const rank = index + 1
              
              // 상위 3인 메달 데코레이션 스타일
              const rankDecor: Record<number, { label: string; bg: string; text: string; border: string }> = {
                1: { label: '🥇 1st', bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/25' },
                2: { label: '🥈 2nd', bg: 'bg-slate-400/10', text: 'text-slate-350', border: 'border-slate-400/20' },
                3: { label: '🥉 3rd', bg: 'bg-amber-700/10', text: 'text-amber-600', border: 'border-amber-750/20' },
              }

              const decor = rankDecor[rank]

              return (
                <div
                  key={m.id}
                  className={`bg-[#151D30]/60 border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all duration-300 hover:scale-[1.01] ${
                    decor ? `border-2 ${decor.border}` : 'border-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* 순위 마킹 */}
                    <div className="w-10 flex items-center justify-center shrink-0">
                      {decor ? (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${decor.bg} ${decor.text} border ${decor.border}`}>
                          {decor.label}
                        </span>
                      ) : (
                        <span className="text-xs font-black text-slate-550">{rank}위</span>
                      )}
                    </div>

                    {/* 아바타 */}
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs">👤</div>
                    )}

                    {/* 이름 & 역할 및 페이서 풍선 */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{m.nickname}</span>
                        {/* 페이서 전용 🎈 표시 */}
                        {m.role === 'PACER' && <span className="text-xs" title="크루 페이서 🎈">🎈</span>}
                        {m.role === 'ADMIN' && <span className="text-[9px]" title="크루 운영자 ⚡">⚡</span>}
                      </div>
                      <span className="text-[9px] text-slate-550 uppercase tracking-widest">{activeCategory} 최고 기록</span>
                    </div>
                  </div>

                  {/* PB 타임 레코드 */}
                  <span className="text-xs font-black tracking-wider text-[#D4FF3F] bg-[#D4FF3F]/5 border border-[#D4FF3F]/15 px-3 py-1 rounded-xl">
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
