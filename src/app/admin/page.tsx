'use client'

import { useState, useEffect } from 'react'
import { mockStore, Member, Location, RunningRecord } from '@/lib/mockStore'
import { createClient } from '@/lib/supabase/client'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { 
  UserCheck, 
  HeartPulse, 
  Plus, 
  Trash2, 
  MapPin, 
  Calendar, 
  Sparkles, 
  Smile, 
  ShieldAlert,
  ListTodo
} from 'lucide-react'

type TabType = 'waiting' | 'exempted' | 'locations' | 'records'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('waiting')
  const [members, setMembers] = useState<Member[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [records, setRecords] = useState<RunningRecord[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mockCheck = checkIsMock()
    setIsMock(mockCheck)
    loadData(mockCheck)
  }, [])

  const loadData = async (mockCheck?: boolean) => {
    const activeIsMock = mockCheck !== undefined ? mockCheck : isMock
    setLoading(true)

    if (activeIsMock) {
      setMembers(mockStore.getMembers())
      setLocations(mockStore.getLocations().filter(l => l.is_active))
      setRecords(mockStore.getRunningRecords())
      setLoading(false)
    } else {
      const supabase = createClient()

      // 1. 프로필 목록 조회
      const { data: dbProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)

      // 2. 활성화된 장소 조회
      const { data: dbLocations } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)

      // 3. 전체 러닝 인증 기록 조회 (닉네임 조인)
      const { data: dbRecords } = await supabase
        .from('running_records')
        .select('*, profiles(nickname, avatar_url)')
        .order('date', { ascending: false })

      if (dbProfiles) {
        // mockStore의 Member 타입과 매핑
        const formattedMembers: Member[] = dbProfiles.map((p: any) => ({
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
          pbs: {} // 마라톤 PB는 필요 시 조회
        }))
        setMembers(formattedMembers)
      }

      if (dbLocations) {
        setLocations(dbLocations)
      }

      if (dbRecords) {
        const formattedRecords: RunningRecord[] = dbRecords.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          user_nickname: r.profiles?.nickname || '신규 크루원',
          user_avatar: r.profiles?.avatar_url || '',
          distance: Number(r.distance),
          location_id: r.location_id || '',
          location_name: r.location_name,
          date: r.date,
          type: r.type,
          is_pacer: r.is_pacer
        }))
        setRecords(formattedRecords)
      }

      setLoading(false)
    }
  }

  // 1. 가입 대기자 승인 처리
  const handleApproveMember = async (memberId: string) => {
    if (isMock) {
      mockStore.updateMemberRole(memberId, 'REGULAR')
      // 승인 후 온보딩 완료 처리 강제
      const member = mockStore.getMembers().find(m => m.id === memberId)
      if (member) {
        mockStore.saveProfile({
          ...mockStore.getProfile(),
          id: member.id,
          role: 'REGULAR',
          is_onboarded: true,
          is_active: true
        } as any)
      }
      loadData()
    } else {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'REGULAR', is_onboarded: true })
        .eq('id', memberId)

      if (error) {
        alert('승인 처리에 실패했습니다.')
      } else {
        loadData()
      }
    }
  }

  // 1-2. 가입 대기자 거절/추방 (비활성화)
  const handleRejectMember = async (memberId: string) => {
    if (confirm('해당 가입 대기자를 거절(비활성화) 처리하시겠습니까?')) {
      if (isMock) {
        mockStore.updateMemberActive(memberId, false)
        loadData()
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: false })
          .eq('id', memberId)

        if (error) {
          alert('비활성화 처리에 실패했습니다.')
        } else {
          loadData()
        }
      }
    }
  }

  // 2. 부상 면제 상태 토글
  const handleToggleExemption = async (memberId: string, currentExempted: boolean) => {
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

  // 3-1. 장소 추가
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLocationName.trim()) return

    if (isMock) {
      mockStore.addLocation(newLocationName.trim())
      setNewLocationName('')
      loadData()
    } else {
      const supabase = createClient()
      const { error } = await supabase
        .from('locations')
        .insert([{ name: newLocationName.trim() }])

      if (error) {
        if (error.code === '23505') {
          alert('이미 존재하는 장소명입니다.')
        } else {
          alert('장소 추가에 실패했습니다.')
        }
      } else {
        setNewLocationName('')
        loadData()
      }
    }
  }

  // 3-2. 장소 삭제 (Soft Delete)
  const handleDeactivateLocation = async (locId: string) => {
    if (confirm('해당 러닝 장소를 비활성화하시겠습니까? 드롭다운 목록에서만 제외되며, 기존 러닝 스냅샷 기록에는 영향을 주지 않습니다.')) {
      if (isMock) {
        mockStore.deleteLocation(locId)
        loadData()
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('locations')
          .update({ is_active: false })
          .eq('id', locId)

        if (error) {
          alert('장소 비활성화에 실패했습니다.')
        } else {
          loadData()
        }
      }
    }
  }

  // 4. 러닝 인증 강제 삭제
  const handleDeleteRecord = async (recordId: string) => {
    if (confirm('이 인증 기록을 강제로 삭제하시겠습니까? 해당 멤버의 이번 달 생존 조건 수치가 즉시 조정됩니다.')) {
      if (isMock) {
        mockStore.deleteRunningRecord(recordId)
        loadData()
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('running_records')
          .delete()
          .eq('id', recordId)

        if (error) {
          alert('기록 삭제에 실패했습니다.')
        } else {
          loadData()
        }
      }
    }
  }

  // 가입 대기중인 유저 필터링
  const waitingMembers = members.filter(m => m.role === 'WAITING')
  // 대기 유저를 제외한 실제 정식 멤버 목록
  const activeMembers = members.filter(m => m.role !== 'WAITING')

  const tabItems = [
    { key: 'waiting', label: `가입 대기 (${waitingMembers.length})`, icon: UserCheck },
    { key: 'exempted', label: '부상 면제 관리', icon: HeartPulse },
    { key: 'locations', label: '장소 관리', icon: MapPin },
    { key: 'records', label: '기록 통합 관리', icon: ListTodo },
  ]

  if (loading && members.length === 0 && locations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="text-xs text-slate-500 animate-pulse">관리 데이터 취합 중...</span>
      </div>
    )
  }

  return (
    <div className="p-5 flex flex-col gap-6 animate-fadeIn">
      {/* 1. 상단 타이틀 */}
      <div className="flex flex-col gap-1.5 relative">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-[#2563EB]" />
          <h1 className="text-lg font-black tracking-tight text-slate-900">어드민 제어판</h1>
        </div>
        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
          Suwon Running Crew Administration
        </p>
      </div>

      {/* 2. 탭 네비게이션 */}
      <nav className="grid grid-cols-2 gap-2 bg-slate-100 border border-slate-200/85 p-1 rounded-2xl">
        {tabItems.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`py-2.5 px-3 rounded-xl text-[10px] font-black tracking-wide flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white text-[#2563EB] border border-slate-200/60 shadow-sm'
                  : 'text-slate-550 hover:text-slate-800 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* 3. 탭 상세 컨텐츠 */}
      <div className="flex-1 flex flex-col min-h-[300px]">
        {/* 가입 대기자 탭 */}
        {activeTab === 'waiting' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-black text-slate-900">신규 가입 신청 현황</h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                카카오 로그인 후 운영진 승인을 대기하는 회원 목록입니다.
              </span>
            </div>

            {waitingMembers.length === 0 ? (
              <div className="bg-white/80 border border-slate-200/50 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <Smile className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-500">대기 중인 신규 가입자가 없습니다.</span>
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1">All clean for now</span>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="bg-white/80 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-sm shadow-inner text-slate-400">
                          👤
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">{member.nickname || '임시닉네임'}</span>
                        <span className="text-[8px] text-slate-500 font-bold tracking-wider">
                          실명: {member.real_name || '온보딩 미완료'} | 성별: {member.gender || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveMember(member.id)}
                        className="py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-[9px] font-black tracking-wide cursor-pointer transition-colors active:scale-95 shadow-sm"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleRejectMember(member.id)}
                        className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[9px] font-black tracking-wide cursor-pointer transition-colors active:scale-95 shadow-sm"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 부상 면제 탭 */}
        {activeTab === 'exempted' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-black text-slate-900">크루원 활동 면제 제어</h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                부상 또는 장기 휴가로 인해 월간 의무 달리기에서 면제시킬 멤버를 제어합니다.
              </span>
            </div>

            {activeMembers.length === 0 ? (
              <div className="bg-white/80 border border-slate-200/50 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold text-slate-400">등록된 정식 회원이 없습니다.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="bg-white/80 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-sm shadow-inner text-slate-400">
                          🏃
                        </div>
                      )}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">{member.nickname}</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                            {member.role}
                          </span>
                        </div>
                        <span className="text-[8px] text-slate-500 font-bold tracking-wider mt-0.5">
                          이름: {member.real_name || '-'} | 구분: {member.is_exempted ? '🩹 면제 회원' : '💪 일반 활동'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleExemption(member.id, member.is_exempted)}
                      className={`py-1.5 px-3 rounded-lg text-[9px] font-black tracking-wide cursor-pointer transition-all duration-200 active:scale-95 shadow-sm ${
                        member.is_exempted
                          ? 'bg-cyan-50 text-cyan-600 border border-cyan-200 hover:bg-cyan-100'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {member.is_exempted ? '면제 취소' : '면제 등록'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 장소 관리 탭 */}
        {activeTab === 'locations' && (
          <section className="space-y-4">
            {/* 새 장소 추가 폼 */}
            <form onSubmit={handleAddLocation} className="flex gap-2.5">
              <input
                type="text"
                placeholder="새 러닝 장소 입력 (예: 만석공원)"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="flex-1 bg-white border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl py-2 px-3.5 text-xs text-slate-900 placeholder-slate-400 transition-all font-semibold shadow-sm"
              />
              <button
                type="submit"
                className="bg-[#2563EB] text-white font-black text-xs px-4 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all duration-300 active:scale-95 shadow-sm hover:bg-[#2563EB]/95"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </form>

            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-black text-slate-900">등록된 러닝 장소 목록</h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                인증 폼에서 선택 가능한 활동 장소 리스트입니다.
              </span>
            </div>

            {locations.length === 0 ? (
              <div className="bg-white/80 border border-slate-200/50 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold text-slate-400">등록된 장소가 없습니다.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {locations.map((loc) => (
                  <div 
                    key={loc.id}
                    className="bg-white/85 border border-slate-200/80 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-black text-slate-800">{loc.name}</span>
                    </div>

                    <button
                      onClick={() => handleDeactivateLocation(loc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="장소 비활성화"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 기록 통합 관리 탭 */}
        {activeTab === 'records' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-black text-slate-900">전체 크루원 러닝 인증 피드</h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                잘못 등록되었거나 어뷰징된 러닝 인증 기록을 강제로 삭제 관리합니다.
              </span>
            </div>

            {records.length === 0 ? (
              <div className="bg-white/80 border border-slate-200/50 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold text-slate-400">인증 기록이 전혀 존재하지 않습니다.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => (
                  <div 
                    key={rec.id}
                    className="bg-white/85 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {rec.user_avatar ? (
                        <img 
                          src={rec.user_avatar} 
                          alt="Avatar" 
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs shrink-0 shadow-inner text-slate-400">
                          🏃
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">{rec.user_nickname}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${
                            rec.type === 'REGULAR'
                              ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {rec.type === 'REGULAR' ? '정기 벙' : '개인런'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] text-slate-550 font-bold uppercase tracking-wide">
                          <span className="flex items-center gap-0.5 text-slate-500">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            {rec.location_name}
                          </span>
                          <span className="flex items-center gap-0.5 text-slate-500">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" />
                            {rec.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-[#2563EB] bg-[#2563EB]/5 border border-[#2563EB]/15 px-2.5 py-1 rounded-xl">
                        {rec.distance.toFixed(1)} km
                      </span>
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="기록 강제 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* 4. 주의사항 안내 배너 */}
      <footer className="mt-auto bg-blue-50/50 border border-blue-200/50 p-3.5 rounded-2xl flex gap-2">
        <ShieldAlert className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <span className="text-[10px] text-slate-600 leading-relaxed font-semibold">
          <strong className="text-slate-900">운영 권한 주의:</strong> 본 대시보드에서 처리되는 모든 데이터 변경(가입 승인, 면제 등록, 기록 강제 삭제 등)은 번복이 어려울 수 있으니 신중하게 관리해 주십시오.
        </span>
      </footer>
    </div>
  )
}
