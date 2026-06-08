'use client'

import { useState, useEffect } from 'react'
import { mockStore, Member, Location, RunningRecord, Profile, Suggestion, GachaItem } from '@/lib/mockStore'
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
  ListTodo,
  Search,
  MessageSquare,
  Gift
} from 'lucide-react'

type TabType = 'waiting' | 'exempted' | 'locations' | 'records' | 'permissions' | 'suggestions' | 'gacha'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('waiting')
  const [members, setMembers] = useState<Member[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [records, setRecords] = useState<RunningRecord[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [adminSearchTerm, setAdminSearchTerm] = useState('')

  // 건의사항 답변 및 편집 상태
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyStatus, setReplyStatus] = useState<'PENDING' | 'INVESTIGATING' | 'COMPLETED' | 'REJECTED'>('PENDING')

  // 가챠(뽑기) 관리 상태
  const [gachaItems, setGachaItems] = useState<GachaItem[]>([])
  const [editingGachaId, setEditingGachaId] = useState<string | null>(null)
  
  // 가챠 등록/수정 폼 필드
  const [gachaName, setGachaName] = useState('')
  const [gachaGrade, setGachaGrade] = useState<'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON'>('COMMON')
  const [gachaDescription, setGachaDescription] = useState('')
  const [gachaEmoji, setGachaEmoji] = useState('🎁')
  const [gachaIsActive, setGachaIsActive] = useState(true)

  useEffect(() => {
    setAdminSearchTerm('')
  }, [activeTab])

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
      setSuggestions(mockStore.getSuggestions())
      setGachaItems(mockStore.getGachaItems())
      setCurrentProfile(mockStore.getProfile())
      setLoading(false)
    } else {
      const supabase = createClient()

      // 내 프로필 상세 정보 조회
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (profile) {
          setCurrentProfile(profile as Profile)
        }
      }

      // 1. 프로필 목록 조회 (정지/강퇴된 회원도 조회 및 복구할 수 있도록 전체 조회)
      const { data: dbProfiles } = await supabase
        .from('profiles')
        .select('*')

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
          can_view_admin: p.can_view_admin ?? false,
          can_edit_admin: p.can_edit_admin ?? false,
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

      // 4. 전체 건의사항 조회
      const { data: dbSugs } = await supabase
        .from('suggestions')
        .select('*, profiles(nickname, avatar_url, real_name)')
        .order('created_at', { ascending: false })

      if (dbSugs) {
        const formattedSugs: Suggestion[] = dbSugs.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          user_nickname: s.profiles?.nickname || '크루원',
          user_avatar: s.profiles?.avatar_url || '',
          user_real_name: s.profiles?.real_name || '',
          title: s.title,
          category: s.category,
          content: s.content,
          is_anonymous: s.is_anonymous,
          image_url: s.image_url || undefined,
          status: s.status,
          reply_content: s.reply_content || undefined,
          reply_by: s.reply_by || undefined,
          reply_at: s.reply_at || undefined,
          created_at: s.created_at,
          updated_at: s.updated_at
        }))
        setSuggestions(formattedSugs)
      }

      // 5. 가챠 보상 목록 조회
      const { data: dbGacha } = await supabase
        .from('gacha_items')
        .select('*')
        .order('created_at', { ascending: true })

      if (dbGacha) {
        setGachaItems(dbGacha)
      }

      setLoading(false)
    }
  }

  // 0-1. 건의사항 답변 등록 및 상태 변경 처리
  const handleReplySuggestion = async (sugId: string) => {
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }

    try {
      if (isMock) {
        mockStore.replySuggestion(sugId, replyText.trim(), replyStatus)
        setEditingSuggestionId(null)
        setReplyText('')
        loadData(true)
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('suggestions')
          .update({
            reply_content: replyText.trim(),
            reply_by: currentProfile?.id,
            reply_at: new Date().toISOString(),
            status: replyStatus
          })
          .eq('id', sugId)

        if (error) {
          alert('답변 등록에 실패했습니다.')
        } else {
          setEditingSuggestionId(null)
          setReplyText('')
          loadData(false)
        }
      }
    } catch {
      alert('답변 저장 중 오류가 발생했습니다.')
    }
  }

  // 0-2. 건의사항 삭제 처리
  const handleDeleteSuggestion = async (sugId: string) => {
    if (!hasEditPermission) {
      alert('삭제 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }

    if (confirm('이 건의사항을 정말 삭제하시겠습니까? 관련 데이터가 영구적으로 삭제됩니다.')) {
      try {
        if (isMock) {
          mockStore.deleteSuggestion(sugId)
          loadData(true)
        } else {
          const supabase = createClient()
          const { error } = await supabase
            .from('suggestions')
            .delete()
            .eq('id', sugId)

          if (error) {
            alert('건의사항 삭제에 실패했습니다.')
          } else {
            loadData(false)
          }
        }
      } catch {
        alert('삭제 중 오류가 발생했습니다.')
      }
    }
  }
  // 0-3. 가챠 보상 아이템 관리 핸들러
  const handleSaveGachaItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }

    if (!gachaName.trim()) {
      alert('아이템명을 입력해 주세요.')
      return
    }
    if (!gachaDescription.trim()) {
      alert('설명을 입력해 주세요.')
      return
    }

    try {
      if (editingGachaId) {
        // 수정 모드
        if (isMock) {
          mockStore.updateGachaItem(editingGachaId, gachaName.trim(), gachaGrade, gachaDescription.trim(), gachaEmoji.trim(), gachaIsActive)
          alert('보상이 수정되었습니다.')
          loadData(true)
        } else {
          const supabase = createClient()
          const { error } = await supabase
            .from('gacha_items')
            .update({
              name: gachaName.trim(),
              grade: gachaGrade,
              description: gachaDescription.trim(),
              emoji: gachaEmoji.trim(),
              is_active: gachaIsActive
            })
            .eq('id', editingGachaId)

          if (error) {
            alert('보상 수정에 실패했습니다.')
          } else {
            alert('보상이 수정되었습니다.')
            loadData(false)
          }
        }
      } else {
        // 생성 모드
        if (isMock) {
          mockStore.addGachaItem({
            name: gachaName.trim(),
            grade: gachaGrade,
            description: gachaDescription.trim(),
            emoji: gachaEmoji.trim()
          })
          alert('새 보상이 등록되었습니다.')
          loadData(true)
        } else {
          const supabase = createClient()
          const { error } = await supabase
            .from('gacha_items')
            .insert([{
              name: gachaName.trim(),
              grade: gachaGrade,
              description: gachaDescription.trim(),
              emoji: gachaEmoji.trim(),
              is_active: true
            }])

          if (error) {
            alert('보상 등록에 실패했습니다.')
          } else {
            alert('새 보상이 등록되었습니다.')
            loadData(false)
          }
        }
      }
      handleCancelEditGacha()
    } catch (err) {
      console.error(err)
      alert('오류가 발생했습니다.')
    }
  }

  const handleStartEditGacha = (item: GachaItem) => {
    setEditingGachaId(item.id)
    setGachaName(item.name)
    setGachaGrade(item.grade)
    setGachaDescription(item.description)
    setGachaEmoji(item.emoji)
    setGachaIsActive(item.is_active)
  }

  const handleCancelEditGacha = () => {
    setEditingGachaId(null)
    setGachaName('')
    setGachaGrade('COMMON')
    setGachaDescription('')
    setGachaEmoji('🎁')
    setGachaIsActive(true)
  }

  const handleDeleteGachaItem = async (id: string) => {
    if (!hasEditPermission) {
      alert('삭제 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }

    if (confirm('이 보상 아이템을 정말 삭제하시겠습니까? 데이터베이스에서 영구 삭제됩니다.')) {
      try {
        if (isMock) {
          mockStore.deleteGachaItem(id)
          alert('보상이 삭제(비활성화)되었습니다.')
          loadData(true)
        } else {
          const supabase = createClient()
          const { error } = await supabase
            .from('gacha_items')
            .delete()
            .eq('id', id)

          if (error) {
            alert('보상 삭제에 실패했습니다.')
          } else {
            alert('보상이 삭제되었습니다.')
            loadData(false)
          }
        }
      } catch (err) {
        console.error(err)
        alert('삭제 중 오류가 발생했습니다.')
      }
    }
  }

  const handleToggleGachaActive = async (item: GachaItem) => {
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }

    try {
      if (isMock) {
        mockStore.updateGachaItem(item.id, item.name, item.grade, item.description, item.emoji, !item.is_active)
        loadData(true)
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('gacha_items')
          .update({ is_active: !item.is_active })
          .eq('id', item.id)

        if (error) {
          alert('상태 변경에 실패했습니다.')
        } else {
          loadData(false)
        }
      }
    } catch (err) {
      console.error(err)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  const isSuperAdmin = currentProfile?.role === 'ADMIN'
  const hasEditPermission = isSuperAdmin || currentProfile?.can_edit_admin === true

  // 1. 가입 대기자 승인 처리
  const handleApproveMember = async (memberId: string) => {
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
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
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
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

  // 1-3. 회원 강퇴 (비활성화) 처리
  const handleKickMember = async (memberId: string) => {
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
    const memberName = members.find(m => m.id === memberId)?.nickname || '해당 크루원'
    if (confirm(`정말 ${memberName}님을 강퇴(비활성화) 처리하시겠습니까?\n강퇴 시 해당 멤버의 접속이 즉시 차단되며 회원 목록에서 제외됩니다.`)) {
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
          alert('강퇴 처리에 실패했습니다.')
        } else {
          loadData()
        }
      }
    }
  }

  // 1-4. 회원 정지 해제(활성화) 처리
  const handleReactivateMember = async (memberId: string) => {
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
    const memberName = members.find(m => m.id === memberId)?.nickname || '해당 크루원'
    if (confirm(`정말 ${memberName}님을 정지 해제(복구) 처리하시겠습니까?\n정지 해제 시 해당 멤버가 다시 정상적으로 서비스를 이용할 수 있게 됩니다.`)) {
      if (isMock) {
        mockStore.updateMemberActive(memberId, true)
        loadData()
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: true })
          .eq('id', memberId)

        if (error) {
          alert('정지 해제 처리에 실패했습니다.')
        } else {
          loadData()
        }
      }
    }
  }

  // 2. 부상 면제 상태 토글
  const handleToggleExemption = async (memberId: string, currentExempted: boolean) => {
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
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
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }

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
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
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
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }
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

  // 5. 운영진 권한 변경 설정 (Super Admin 전용)
  const handleTogglePermission = async (memberId: string, type: 'view' | 'edit', currentVal: boolean) => {
    if (!isSuperAdmin) {
      alert('최고 운영자만 권한 설정을 변경할 수 있습니다.')
      return
    }

    const updateObj = type === 'view' 
      ? { can_view_admin: !currentVal } 
      : { can_edit_admin: !currentVal }

    if (isMock) {
      const target = members.find(m => m.id === memberId)
      if (target) {
        const newView = type === 'view' ? !currentVal : !!target.can_view_admin
        const newEdit = type === 'edit' ? !currentVal : !!target.can_edit_admin
        mockStore.updateMemberAdminPermissions(memberId, newView, newEdit)
      }
      loadData()
    } else {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update(updateObj)
        .eq('id', memberId)

      if (error) {
        alert('권한 설정 변경에 실패했습니다.')
      } else {
        loadData()
      }
    }
  }

  // 가입 대기중인 유저 필터링 (활성화된 대기 유저만)
  const waitingMembers = members.filter(m => m.role === 'WAITING' && m.is_active)
  // 대기 유저를 제외한 실제 정식 멤버 목록 (활성화된 멤버만)
  const activeMembers = members.filter(m => m.role !== 'WAITING' && m.is_active)
  // 비활성화(정지/강퇴)된 크루원 목록
  const inactiveMembers = members.filter(m => !m.is_active)

  const filteredWaitingMembers = waitingMembers.filter(m =>
    m.nickname.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    (m.real_name && m.real_name.toLowerCase().includes(adminSearchTerm.toLowerCase()))
  )

  const filteredActiveMembers = activeMembers.filter(m =>
    m.nickname.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    (m.real_name && m.real_name.toLowerCase().includes(adminSearchTerm.toLowerCase()))
  )

  const filteredInactiveMembers = inactiveMembers.filter(m =>
    m.nickname.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    (m.real_name && m.real_name.toLowerCase().includes(adminSearchTerm.toLowerCase()))
  )

  const filteredRecords = records.filter(r =>
    r.user_nickname.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    (r.location_name && r.location_name.toLowerCase().includes(adminSearchTerm.toLowerCase()))
  )

  const filteredSuggestions = suggestions.filter(s =>
    s.title.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    s.content.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    (s.is_anonymous ? '익명' : s.user_nickname.toLowerCase()).includes(adminSearchTerm.toLowerCase())
  )

  const filteredGachaItems = gachaItems.filter(item =>
    item.name.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    item.grade.toLowerCase().includes(adminSearchTerm.toLowerCase())
  )

  const statusConfig: Record<string, { label: string; style: string }> = {
    PENDING: { label: '대기 중', style: 'bg-orange-50 text-orange-600 border-orange-200' },
    INVESTIGATING: { label: '검토 중', style: 'bg-blue-50 text-blue-600 border-blue-200' },
    COMPLETED: { label: '답변 완료', style: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    REJECTED: { label: '반려됨', style: 'bg-rose-50 text-rose-600 border-rose-200' }
  }

  const tabItems = [
    { key: 'waiting', label: `가입 대기 (${waitingMembers.length})`, icon: UserCheck },
    { key: 'exempted', label: '부상 면제 관리', icon: HeartPulse },
    { key: 'locations', label: '장소 관리', icon: MapPin },
    { key: 'records', label: '기록 통합 관리', icon: ListTodo },
    { key: 'suggestions', label: `건의사항 (${suggestions.length})`, icon: MessageSquare },
    { key: 'gacha', label: '뽑기 보상 관리', icon: Gift },
  ]

  if (isSuperAdmin) {
    tabItems.push({ key: 'permissions', label: '운영진 권한 설정', icon: ShieldAlert })
  }

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

      {/* 검색 바 (장소 관리 탭이 아닐 때만 표시) */}
      {activeTab !== 'locations' && (
        <div className="relative z-15">
          <input
            type="text"
            placeholder={
              activeTab === 'records'
                ? '이름/닉네임/장소명으로 기록 검색...'
                : activeTab === 'gacha'
                ? '보상명/설명/등급으로 보상 검색...'
                : '이름/닉네임으로 크루원 검색...'
            }
            value={adminSearchTerm}
            onChange={(e) => setAdminSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none focus:border-[#2563EB] transition-all text-slate-800 font-semibold"
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
      )}

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

            {filteredWaitingMembers.length === 0 ? (
              <div className="bg-white/80 border border-slate-200/50 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <Smile className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-500">
                  {waitingMembers.length === 0 ? '대기 중인 신규 가입자가 없습니다.' : '검색 결과가 없습니다.'}
                </span>
                {waitingMembers.length === 0 && (
                  <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1">All clean for now</span>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWaitingMembers.map((member) => (
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
                        disabled={!hasEditPermission}
                        onClick={() => handleApproveMember(member.id)}
                        className={`py-1.5 px-3 rounded-lg text-[9px] font-black tracking-wide cursor-pointer transition-colors active:scale-95 shadow-sm ${
                          !hasEditPermission
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-blue-50 hover:bg-blue-100 text-[#2563EB] border-blue-200'
                        }`}
                      >
                        승인
                      </button>
                      <button
                        disabled={!hasEditPermission}
                        onClick={() => handleRejectMember(member.id)}
                        className={`py-1.5 px-3 rounded-lg text-[9px] font-black tracking-wide cursor-pointer transition-colors active:scale-95 shadow-sm ${
                          !hasEditPermission
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                        }`}
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

            {filteredActiveMembers.length === 0 ? (
              <div className="bg-white/80 border border-slate-200/50 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold text-slate-400">
                  {activeMembers.length === 0 ? '등록된 정식 회원이 없습니다.' : '검색 결과가 없습니다.'}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActiveMembers.map((member) => (
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

                    <div className="flex items-center gap-2">
                      <button
                        disabled={!hasEditPermission}
                        onClick={() => handleToggleExemption(member.id, member.is_exempted)}
                        className={`py-1.5 px-2.5 rounded-lg text-[9px] font-black tracking-wide cursor-pointer transition-all duration-200 active:scale-95 shadow-sm border ${
                          !hasEditPermission
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                            : member.is_exempted
                              ? 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100'
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {member.is_exempted ? '면제 취소' : '면제 등록'}
                      </button>
                      <button
                        disabled={!hasEditPermission || member.role === 'ADMIN'}
                        onClick={() => handleKickMember(member.id)}
                        className={`py-1.5 px-2.5 rounded-lg text-[9px] font-black tracking-wide cursor-pointer transition-all duration-200 active:scale-95 shadow-sm border ${
                          !hasEditPermission || member.role === 'ADMIN'
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-rose-50 text-rose-650 border-rose-100 hover:bg-rose-100/50'
                        }`}
                      >
                        강퇴
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 정지 및 강퇴된 회원 관리 섹션 */}
            {filteredInactiveMembers.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200/60 space-y-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black text-rose-600">정지 / 강퇴 회원 목록</h3>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                    강퇴 또는 비활성화 처리되어 접속이 차단된 회원 목록입니다.
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredInactiveMembers.map((member) => (
                    <div 
                      key={member.id}
                      className="p-4 rounded-2xl flex items-center justify-between shadow-sm border border-rose-100 bg-rose-50/10 animate-fadeIn"
                    >
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img 
                            src={member.avatar_url} 
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 opacity-60"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-sm shadow-inner text-slate-400 opacity-60">
                            👤
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-700 line-through">{member.nickname || '임시닉네임'}</span>
                            <span className="text-[8px] text-rose-600 font-black uppercase px-1.5 py-0.2 rounded bg-rose-50 border border-rose-100">
                              BANNED
                            </span>
                          </div>
                          <span className="text-[8px] text-slate-500 font-bold tracking-wider mt-0.5">
                            실명: {member.real_name || '-'} | 구분: {member.role}
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={!hasEditPermission}
                        onClick={() => handleReactivateMember(member.id)}
                        className={`py-1.5 px-3 rounded-lg text-[9px] font-black tracking-wide cursor-pointer transition-all duration-200 active:scale-95 shadow-sm border ${
                          !hasEditPermission
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50'
                        }`}
                      >
                        정지 해제
                      </button>
                    </div>
                  ))}
                </div>
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
                disabled={!hasEditPermission}
                className={`font-black text-xs px-4 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all duration-300 active:scale-95 shadow-sm ${
                  !hasEditPermission
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                    : 'bg-[#2563EB] text-white hover:bg-[#2563EB]/95'
                }`}
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
                      disabled={!hasEditPermission}
                      onClick={() => handleDeactivateLocation(loc.id)}
                      className={`p-1.5 rounded-xl transition-colors ${
                        !hasEditPermission
                          ? 'opacity-30 cursor-not-allowed text-slate-350'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                      }`}
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

            {filteredRecords.length === 0 ? (
              <div className="bg-white/80 border border-slate-200/50 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold text-slate-400">
                  {records.length === 0 ? '인증 기록이 전혀 존재하지 않습니다.' : '검색 결과가 없습니다.'}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((rec) => (
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
                        disabled={!hasEditPermission}
                        onClick={() => handleDeleteRecord(rec.id)}
                        className={`p-1.5 rounded-xl transition-colors ${
                          !hasEditPermission
                            ? 'opacity-30 cursor-not-allowed text-slate-350'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                        }`}
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

        {/* 운영진 권한 관리 탭 (최고 관리자 전용) */}
        {activeTab === 'permissions' && isSuperAdmin && (
          <section className="space-y-4 animate-fadeIn">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-black text-slate-900">운영진 및 권한 부여 관리</h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                일반 크루원에게 어드민 페이지 조회 및 수정 권한을 개별적으로 설정합니다.
              </span>
            </div>

            {filteredActiveMembers.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-6">검색 결과가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {filteredActiveMembers.map((member) => {
                  const isMe = member.id === currentProfile?.id
                  return (
                    <div 
                      key={member.id}
                      className="bg-white/80 border border-slate-200/80 p-4 rounded-2xl flex flex-col gap-3.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {member.avatar_url ? (
                            <img 
                              src={member.avatar_url} 
                              alt="Avatar" 
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-400 shadow-inner">
                              👤
                            </div>
                          )}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900">{member.nickname} {isMe && '(나)'}</span>
                              <span className="text-[8px] text-slate-500 font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                                {member.role}
                              </span>
                            </div>
                            <span className="text-[8px] text-slate-500 font-bold tracking-wider mt-0.5">
                              실명: {member.real_name || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 권한 토글 버튼들 */}
                      {!isMe && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                          {/* 조회 권한 */}
                          <div className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-200/50">
                            <span className="text-[9px] font-black text-slate-700">어드민 조회 권한</span>
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(member.id, 'view', !!member.can_view_admin)}
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                                member.can_view_admin ? 'bg-[#2563EB]' : 'bg-slate-300'
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                                  member.can_view_admin ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* 수정 권한 */}
                          <div className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-200/50">
                            <span className="text-[9px] font-black text-slate-700">어드민 수정 권한</span>
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(member.id, 'edit', !!member.can_edit_admin)}
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                                member.can_edit_admin ? 'bg-[#2563EB]' : 'bg-slate-300'
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                                  member.can_edit_admin ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      )}
                      {isMe && (
                        <span className="text-[9px] text-slate-400 font-bold block mt-1 text-center bg-slate-50 rounded-lg py-1 border border-slate-200/40">
                          최고 관리자는 항상 모든 권한을 가집니다.
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* 건의사항 관리 탭 */}
        {activeTab === 'suggestions' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-black text-slate-900">크루원 건의 및 1:1 문의 관리</h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                정회원 이상 크루원들이 제출한 건의사항에 답변하고 진행 상태를 업데이트합니다.
              </span>
            </div>

            {filteredSuggestions.length === 0 ? (
              <div className="bg-white/80 border border-slate-200/50 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <Smile className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-500">
                  {suggestions.length === 0 ? '접수된 건의사항이 없습니다.' : '검색 결과가 없습니다.'}
                </span>
              </div>
            ) : (
              <div className="space-y-3 pb-8">
                {filteredSuggestions.map((sug) => {
                  const isEditingThis = editingSuggestionId === sug.id
                  const status = statusConfig[sug.status] || { label: sug.status, style: 'bg-slate-100 border-slate-200' }
                  
                  return (
                    <div 
                      key={sug.id} 
                      className={`bg-white border p-4 rounded-2xl flex flex-col gap-3 shadow-sm transition-all text-left ${
                        isEditingThis ? 'border-[#2563EB] ring-1 ring-blue-500/10' : 'border-slate-200'
                      }`}
                    >
                      {/* 헤더: 카테고리, 작성일, 처리상태 */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.2 rounded text-slate-500">
                            {sug.category}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.2 rounded border ${status.style}`}>
                            {status.label}
                          </span>
                        </div>
                        <span className="text-[8px] text-slate-400 font-bold">
                          {new Date(sug.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* 본문: 제목 및 내용 */}
                      <div className="text-left space-y-1.5">
                        <h3 className="text-xs font-black text-slate-900">{sug.title}</h3>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {sug.content}
                        </p>
                        <div className="text-[8px] text-slate-400 font-bold">
                          작성자: {sug.is_anonymous ? '익명 크루원' : sug.user_real_name ? `${sug.user_real_name} (${sug.user_nickname})` : sug.user_nickname}
                          {sug.is_anonymous && ' 🔒 (익명 선택됨)'}
                        </div>

                        {/* 첨부 이미지 */}
                        {sug.image_url && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-60 bg-slate-50 flex justify-center items-center">
                            <img 
                              src={sug.image_url} 
                              alt="첨부 이미지" 
                              className="max-h-60 max-w-full object-contain cursor-pointer shadow-inner"
                              onClick={() => window.open(sug.image_url, '_blank')}
                              title="클릭하여 원본보기"
                            />
                          </div>
                        )}
                      </div>

                      {/* 기존 답변이 있는 경우 */}
                      {!isEditingThis && sug.reply_content && (
                        <div className="p-3 bg-blue-50/25 border border-blue-100 rounded-xl text-left space-y-1">
                          <div className="flex items-center justify-between text-[8px] text-[#2563EB] font-bold uppercase tracking-wider">
                            <span>✓ 등록된 운영진 답변</span>
                            <span>
                              {new Date(sug.reply_at || sug.updated_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {sug.reply_content}
                          </p>
                          <div className="text-[8px] text-slate-400 text-right font-bold">
                            답변 작성자: {sug.reply_by_nickname || '운영진'}
                          </div>
                        </div>
                      )}

                      {/* 답변 편집 모드 */}
                      {isEditingThis ? (
                        <div className="space-y-3 pt-2 border-t border-slate-100 text-left">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 block">처리 상태 선택</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {(['PENDING', 'INVESTIGATING', 'COMPLETED', 'REJECTED'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => setReplyStatus(st)}
                                  className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                                    replyStatus === st
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-black'
                                      : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                                  }`}
                                >
                                  {statusConfig[st]?.label || st}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 block">답변 내용</label>
                            <textarea
                              rows={3}
                              placeholder="답변 내용을 작성해 주세요..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl p-2.5 text-xs text-slate-900 leading-relaxed resize-none font-semibold shadow-inner"
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingSuggestionId(null)}
                              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-bold cursor-pointer transition-all"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReplySuggestion(sug.id)}
                              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black cursor-pointer transition-all shadow-sm animate-pulseFast"
                            >
                              저장하기
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end border-t border-slate-100/70 pt-3">
                          <button
                            type="button"
                            disabled={!hasEditPermission}
                            onClick={() => {
                              setEditingSuggestionId(sug.id)
                              setReplyText(sug.reply_content || '')
                              setReplyStatus(sug.status)
                            }}
                            className={`py-1.5 px-3 rounded-lg text-[9px] font-bold cursor-pointer transition-all border ${
                              !hasEditPermission
                                ? 'opacity-30 cursor-not-allowed text-slate-400 bg-slate-50 border-slate-200'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {sug.reply_content ? '답변/상태 수정 ⚙️' : '답변 작성 및 처리 💬'}
                          </button>
                          <button
                            type="button"
                            disabled={!hasEditPermission}
                            onClick={() => handleDeleteSuggestion(sug.id)}
                            className={`py-1.5 px-3 rounded-lg text-[9px] font-bold cursor-pointer transition-all border ${
                              !hasEditPermission
                                ? 'opacity-30 cursor-not-allowed text-slate-400 bg-slate-50 border-slate-200'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                            }`}
                          >
                            삭제
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
        {/* 코인 뽑기 보상 관리 탭 */}
        {activeTab === 'gacha' && (
          <section className="space-y-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-black text-slate-900">코인 뽑기 보상 관리</h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                플레이그라운드 코인 뽑기에서 당첨되는 보상들을 실시간으로 관리합니다. (등급별 고정 확률: 전설 1% / 영웅 3% / 희귀 5% / 일반 91%)
              </span>
            </div>

            {/* 등록/수정 폼 */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4 text-left">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                {editingGachaId ? '보상 수정하기 (수정 모드)' : '새로운 보상 등록하기'}
              </h3>
              
              <form onSubmit={handleSaveGachaItem} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[9px] font-black text-slate-500 block">이모지 3D</label>
                    <input
                      type="text"
                      placeholder="🎁"
                      value={gachaEmoji}
                      onChange={(e) => setGachaEmoji(e.target.value)}
                      disabled={!hasEditPermission}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl p-2.5 text-xs text-slate-900 text-center font-bold shadow-inner disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[9px] font-black text-slate-500 block">등급 설정</label>
                    <select
                      value={gachaGrade}
                      onChange={(e) => setGachaGrade(e.target.value as any)}
                      disabled={!hasEditPermission}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl p-2.5 text-xs text-slate-900 font-semibold shadow-inner disabled:opacity-50"
                    >
                      <option value="COMMON">일반 (COMMON) - 확률 91%</option>
                      <option value="RARE">희귀 (RARE) - 확률 5%</option>
                      <option value="EPIC">영웅 (EPIC) - 확률 3%</option>
                      <option value="LEGENDARY">전설 (LEGENDARY) - 확률 1%</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 block">보상 아이템명</label>
                  <input
                    type="text"
                    placeholder="예: 👑 [전설] 뷔페 식사권 (등급 말머리 포함 권장)"
                    value={gachaName}
                    onChange={(e) => setGachaName(e.target.value)}
                    disabled={!hasEditPermission}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl p-2.5 text-xs text-slate-900 font-semibold shadow-inner disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 block">보상 설명 (획득 방법 및 상세 내용)</label>
                  <textarea
                    rows={3}
                    placeholder="예: 대박! 다음 정기 모임 뒤풀이 때 특급 호텔 뷔페 식사권을 증정합니다."
                    value={gachaDescription}
                    onChange={(e) => setGachaDescription(e.target.value)}
                    disabled={!hasEditPermission}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl p-2.5 text-xs text-slate-900 leading-relaxed font-semibold resize-none shadow-inner disabled:opacity-50"
                  />
                </div>

                {editingGachaId && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <input
                      type="checkbox"
                      id="gacha_active_checkbox"
                      checked={gachaIsActive}
                      onChange={(e) => setGachaIsActive(e.target.checked)}
                      disabled={!hasEditPermission}
                      className="w-3.5 h-3.5 text-[#2563EB] focus:ring-[#2563EB] border-slate-350 rounded cursor-pointer disabled:opacity-50"
                    />
                    <label htmlFor="gacha_active_checkbox" className="text-[10px] font-black text-slate-700 cursor-pointer select-none">
                      이 보상을 활성화하여 추첨 리스트에 포함합니다.
                    </label>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  {editingGachaId && (
                    <button
                      type="button"
                      onClick={handleCancelEditGacha}
                      className="py-2 px-4 bg-slate-150 hover:bg-slate-200 text-slate-650 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                    >
                      수정 취소
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!hasEditPermission}
                    className={`py-2 px-5 rounded-xl text-[10px] font-black cursor-pointer transition-all shadow-sm ${
                      !hasEditPermission
                        ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-[#2563EB] text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingGachaId ? '보상 정보 업데이트 ✓' : '신규 보상 등록하기 +'}
                  </button>
                </div>
              </form>
            </div>

            {/* 목록 영역 */}
            <div className="space-y-3 pb-8">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-700">전체 보상 목록 ({filteredGachaItems.length}개)</span>
                {adminSearchTerm && <span className="text-[8px] text-[#2563EB] font-bold">"{adminSearchTerm}" 검색 필터 적용됨</span>}
              </div>

              {filteredGachaItems.length === 0 ? (
                <div className="bg-white border border-slate-200 py-12 rounded-3xl text-center text-slate-400 text-xs font-bold shadow-sm">
                  등록되었거나 활성화된 가챠 보상이 없습니다.
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                  {filteredGachaItems.map((item) => {
                    // 등급에 따른 디자인 매핑
                    const design = 
                      item.grade === 'LEGENDARY' ? { border: 'border-amber-300 bg-amber-50/20', badge: 'bg-amber-100 text-amber-700 border-amber-250', label: '전설 (1%)' } :
                      item.grade === 'EPIC' ? { border: 'border-purple-300 bg-purple-50/20', badge: 'bg-purple-100 text-purple-700 border-purple-250', label: '영웅 (3%)' } :
                      item.grade === 'RARE' ? { border: 'border-cyan-300 bg-cyan-50/20', badge: 'bg-blue-100 text-blue-700 border-blue-250', label: '희귀 (5%)' } :
                      { border: 'border-slate-200 bg-slate-50/40', badge: 'bg-slate-100 text-slate-600 border-slate-200', label: '일반 (91%)' };

                    return (
                      <div 
                        key={item.id}
                        className={`bg-white border p-4.5 rounded-2xl flex flex-col justify-between gap-3.5 shadow-sm transition-all text-left ${design.border} ${
                          !item.is_active ? 'opacity-55' : ''
                        } ${editingGachaId === item.id ? 'ring-2 ring-blue-500/20 border-[#2563EB]' : ''}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{item.emoji || '🎁'}</span>
                              <span className={`text-[8px] font-black px-2 py-0.2 rounded border uppercase ${design.badge}`}>
                                {design.label}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={!hasEditPermission}
                              onClick={() => handleToggleGachaActive(item)}
                              className={`text-[8.5px] font-black px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                item.is_active
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-250 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                              } disabled:opacity-50`}
                            >
                              {item.is_active ? '● 활성' : '○ 비활성'}
                            </button>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 leading-snug">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end border-t border-slate-100/80 pt-2.5">
                          <button
                            type="button"
                            disabled={!hasEditPermission}
                            onClick={() => handleStartEditGacha(item)}
                            className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-bold cursor-pointer transition-all disabled:opacity-50"
                          >
                            수정 ⚙️
                          </button>
                          <button
                            type="button"
                            disabled={!hasEditPermission}
                            onClick={() => handleDeleteGachaItem(item.id)}
                            className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-[9px] font-bold cursor-pointer transition-all disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* 4. 주의사항 안내 배너 */}
      <footer className="mt-auto bg-blue-50/50 border border-blue-200/50 p-3.5 rounded-2xl flex gap-2">
        <ShieldAlert className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <span className="text-[10px] text-slate-600 leading-relaxed font-semibold">
          <strong className="text-slate-900">운영 권한 주의:</strong> {hasEditPermission ? '본 대시보드에서 처리되는 모든 데이터 변경(가입 승인, 면제 등록, 기록 강제 삭제 등)은 번복이 어려울 수 있으니 신중하게 관리해 주십시오.' : '현재 조회 전용 권한입니다. 데이터 변경 권한이 필요한 경우 최고 관리자(ADMIN)에게 문의하세요.'}
        </span>
      </footer>
    </div>
  )
}
