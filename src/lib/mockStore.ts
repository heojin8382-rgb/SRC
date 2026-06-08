// 수원러닝크루 (SRC) Mock 데이터 스토어 및 localStorage 제어 헬퍼

export interface Profile {
  id: string
  nickname: string
  real_name: string
  birth_year: number
  gender: string
  avatar_url: string
  role: 'WAITING' | 'REGULAR' | 'PACER' | 'ADMIN'
  is_active: boolean
  is_exempted: boolean
  is_onboarded: boolean
  show_pb?: boolean
  can_view_admin?: boolean
  can_edit_admin?: boolean
}

export interface RunningRecord {
  id: string
  user_id: string
  user_nickname: string
  user_avatar: string
  distance: number
  location_id: string
  location_name: string
  date: string // YYYY-MM-DD
  type: 'PERSONAL' | 'REGULAR'
  is_pacer: boolean
  proof_image_url?: string
  likes?: string[] // user_ids of users who liked
  comments?: {
    id: string
    user_id: string
    user_nickname: string
    user_avatar: string
    comment_text: string
    created_at: string
  }[]
}

export interface Location {
  id: string
  name: string
  is_active: boolean
}

export interface MarathonPB {
  id: string
  user_id: string
  category: '10K' | 'Half' | 'Full'
  record_time: string // HH:MM:SS
}

export interface Member {
  id: string
  nickname: string
  real_name: string
  birth_year: number
  gender: string
  avatar_url: string
  role: 'WAITING' | 'REGULAR' | 'PACER' | 'ADMIN'
  is_active: boolean
  is_exempted: boolean
  is_onboarded: boolean
  show_pb?: boolean
  can_view_admin?: boolean
  can_edit_admin?: boolean
  pbs: {
    '10K'?: string
    'Half'?: string
    'Full'?: string
  }
}

export interface Suggestion {
  id: string
  user_id: string
  user_nickname: string
  user_avatar: string
  user_real_name: string
  title: string
  category: string
  content: string
  is_anonymous: boolean
  image_url?: string
  status: 'PENDING' | 'INVESTIGATING' | 'COMPLETED' | 'REJECTED'
  reply_content?: string
  reply_by?: string
  reply_by_nickname?: string
  reply_at?: string
  created_at: string
  updated_at: string
}

export interface GachaItem {
  id: string
  name: string
  grade: 'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON'
  description: string
  emoji: string
  is_active: boolean
}

// 기본 위치 목록 시드 데이터
const DEFAULT_LOCATIONS: Location[] = [
  { id: 'loc-1', name: '광교호수공원', is_active: true },
  { id: 'loc-2', name: '수원종합운동장', is_active: true },
  { id: 'loc-3', name: '만석공원', is_active: true },
  { id: 'loc-4', name: '신대호수공원', is_active: true },
  { id: 'loc-5', name: '서호공원', is_active: false }, // Soft deleted 장소 예제
]

// 기본 크루원 시드 데이터
const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'user-pacer',
    nickname: '이페이서/98/남',
    real_name: '이페이서',
    birth_year: 1998,
    gender: '남',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    role: 'PACER',
    is_active: true,
    is_exempted: false,
    is_onboarded: true,
    pbs: { '10K': '00:39:45', 'Half': '01:28:15', 'Full': '03:15:30' }
  },
  {
    id: 'user-regular1',
    nickname: '박정회원/94/여',
    real_name: '박정회원',
    birth_year: 1994,
    gender: '여',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    role: 'REGULAR',
    is_active: true,
    is_exempted: false,
    is_onboarded: true,
    pbs: { '10K': '00:48:20', 'Half': '01:52:10' }
  },
  {
    id: 'user-exempted',
    nickname: '정부상/96/남',
    real_name: '정부상',
    birth_year: 1996,
    gender: '남',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    role: 'REGULAR',
    is_active: true,
    is_exempted: true, // 면제자 상태 예제
    is_onboarded: true,
    pbs: { '10K': '00:44:15', 'Full': '03:45:00' }
  },
  {
    id: 'user-waiting1',
    nickname: '김대기/02/여',
    real_name: '김대기',
    birth_year: 2002,
    gender: '여',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    role: 'WAITING', // 승인 대기자 예제
    is_active: true,
    is_exempted: false,
    is_onboarded: true,
    pbs: {}
  },
  {
    id: 'user-inactive',
    nickname: '최강퇴/92/남',
    real_name: '최강퇴',
    birth_year: 1992,
    gender: '남',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    role: 'REGULAR',
    is_active: false, // Soft deleted 회원 예제
    is_exempted: false,
    is_onboarded: true,
    pbs: { '10K': '00:52:30' }
  },
  {
    id: 'user-admin1',
    nickname: '황운영/88/남',
    real_name: '황운영',
    birth_year: 1988,
    gender: '남',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    role: 'ADMIN', // 어드민 계정
    is_active: true,
    is_exempted: false,
    is_onboarded: true,
    pbs: { '10K': '00:37:10', 'Half': '01:21:40', 'Full': '02:58:10' }
  }
]

const DEFAULT_GACHA_ITEMS: GachaItem[] = [
  { id: 'g1', name: '👑 [전설] 뷔페 식사권', grade: 'LEGENDARY', description: '대박! 다음 정기 모임 뒤풀이 때 특급 호텔/패밀리 뷔페 식사권을 증정합니다. (크루 회비 또는 크루장 찬스!)', emoji: '🥩', is_active: true },
  { id: 'g2', name: '👑 [전설] 크루장과 1:1 티타임런', grade: 'LEGENDARY', description: '크루장과 함께 가볍게 달리고, 크루장이 쏘는 고급 디저트와 커피 티타임을 함께 가집니다.', emoji: '☕', is_active: true },
  { id: 'g3', name: '🎈 [영웅] 커피쿠폰(아아)', grade: 'EPIC', description: '축하합니다! 시원한 스타벅스 아이스 아메리카노 모바일 기프티콘을 드립니다.', emoji: '🥤', is_active: true },
  { id: 'g4', name: '🎈 [영웅] 원하는 페이서와 1:1 러닝', grade: 'EPIC', description: '내가 지목한 페이서 크루원과 약속을 잡고 단둘이 원하는 속도와 코스로 1:1 리딩런을 뜁니다.', emoji: '🏃‍♂️', is_active: true },
  { id: 'g5', name: '🎈 [영웅] 벙 참석 시 인생샷 보정권', grade: 'EPIC', description: '정기 벙 때 촬영된 사진 중 원하는 사진 한 장을 크루 공식 포토그래퍼가 화보급으로 보정해 드립니다.', emoji: '📸', is_active: true },
  { id: 'g6', name: '🩹 [희귀] 벙 때 개인 얼음컵 증정', grade: 'RARE', description: '무더운 여름 정기 벙 때 시원한 얼음이 가득 찬 개인 얼음컵을 현장에서 스페셜 보급으로 드립니다!', emoji: '🧊', is_active: true },
  { id: 'g7', name: '🩹 [희귀] SRC 공식 러닝양말 증정', grade: 'RARE', description: '쿠션감이 뛰어난 고성능 기능성 SRC 공식 크루 러닝 양말 1켤레를 즉시 지급해 드립니다.', emoji: '🧦', is_active: true },
  { id: 'g8', name: '🩹 [희귀] 일주일 부상 면제 생존권', grade: 'RARE', description: '이번 주에 달리기 미션을 완수하지 못하더라도 생존 성공으로 인정되는 수동 부상 면제권을 적용해 드립니다.', emoji: '🩹', is_active: true },
  { id: 'g9', name: '🩹 [희귀] 정기 벙 간식/음료 선택권', grade: 'RARE', description: '다음 벙 종료 후 제공되는 보급 음료나 간식 메뉴의 종류와 브랜드를 당첨자가 전적으로 결정합니다.', emoji: '🍪', is_active: true },
  { id: 'g10', name: '👟 [건강한 꽝] 오늘 인증 거리 +100m 보너스 런', grade: 'COMMON', description: '아쉽게도 꽝입니다! 하지만 러너답게 오늘 달릴 목표 거리에서 100m를 보너스로 더 달리고 오세요! 🏃‍♂️', emoji: '🏃‍♀️', is_active: true },
  { id: 'g11', name: '🙌 [유쾌한 꽝] 벙 집결지 하이파이브 인간 환영대', grade: 'COMMON', description: '다음 벙 때 집결지 입구에 서서 도착하는 모든 크루원들과 하이파이브를 하며 에너제틱하게 환영해 주세요!', emoji: '🙌', is_active: true },
  { id: 'g12', name: '✍️ [유쾌한 꽝] 단톡방에 크루원 1명 지목해서 칭찬 3줄 쓰기', grade: 'COMMON', description: '크루 단체 단톡방에 오늘 고생한 크루원 중 한 명을 지목하여 고마움이나 칭찬의 글을 3줄 작성해 보세요.', emoji: '💬', is_active: true },
  { id: 'g13', name: '🙇 [유쾌한 꽝] 다음 벙 종료 후 운영진에게 감사 인사하기', grade: 'COMMON', description: '벙 준비로 항상 애쓰는 운영진 크루원에게 다가가 "항상 고생하십니다! 덕분에 잘 뜁니다"라며 따뜻한 감사를 전하세요.', emoji: '🤝', is_active: true },
  { id: 'g14', name: '🤳 [유쾌한 꽝] 단체사진 찍을 때 맨 앞줄 정중앙 포즈 취하기', grade: 'COMMON', description: '다음 러닝 종료 후 단체 사진 촬영 시 무조건 가장 앞줄 중앙에 자리를 잡고 당당하고 유쾌한 시그니처 포즈를 취해 보세요!', emoji: '📸', is_active: true },
  { id: 'g15', name: '🏃 [유쾌한 꽝] 다음 벙에서 페이서 바로 뒤 밀착 마크런', grade: 'COMMON', description: '페이스 메이커를 신뢰하세요! 다음 벙 러닝 때 지정된 페이서의 바로 뒷자리에서 1m 간격을 유지하며 끝까지 따라가 봅니다.', emoji: '👣', is_active: true },
  { id: 'g16', name: '🥤 [유쾌한 꽝] 벙 끝난 후 물 보급소 종이컵 정리 돕기', grade: 'COMMON', description: '지구를 지키는 친환경 러너! 다음 모임 종료 후 생수 보급소의 빈 종이컵과 플라스틱 병 수거를 적극적으로 도와주세요.', emoji: '🗑️', is_active: true },
  { id: 'g17', name: '📢 [유쾌한 꽝] 다음 벙 자기소개 때 가장 우렁차게 말하기', grade: 'COMMON', description: '크루원들에게 강렬한 인상을! 다음 벙 시작 전 자기소개 시간에 가장 먼저 손을 들고 씩씩하고 크게 자기소개를 시작하세요.', emoji: '📢', is_active: true }
]

const getMockYearMonth = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// 기본 인증 피드 시드 데이터 (동적 월 기준)
const getDynamicDefaultRecords = (): RunningRecord[] => {
  const ym = getMockYearMonth()
  return [
    {
      id: 'rec-1',
      user_id: 'user-pacer',
      user_nickname: '이페이서/98/남',
      user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      distance: 5.2,
      location_id: 'loc-1',
      location_name: '광교호수공원',
      date: `${ym}-15`,
      type: 'REGULAR',
      is_pacer: true
    },
    {
      id: 'rec-2',
      user_id: 'user-regular1',
      user_nickname: '박정회원/94/여',
      user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      distance: 4.8,
      location_id: 'loc-3',
      location_name: '만석공원',
      date: `${ym}-16`,
      type: 'PERSONAL',
      is_pacer: false
    },
    {
      id: 'rec-3',
      user_id: 'user-admin1',
      user_nickname: '황운영/88/남',
      user_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      distance: 10.0,
      location_id: 'loc-2',
      location_name: '수원종합운동장',
      date: `${ym}-17`,
      type: 'REGULAR',
      is_pacer: false
    }
  ]
}

// 로컬 스토리지 초기화 및 로드 함수
function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : defaultValue
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

// ---------------------- 스토어 API ----------------------

export const mockStore = {
  // 1. 내 프로필 관리
  getProfile(): Profile {
    const defaultProfile: Profile = {
      id: 'mock-current-user',
      nickname: '김러너/96/남',
      real_name: '김러너',
      birth_year: 1996,
      gender: '남',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      role: 'REGULAR', // 기본 역할을 REGULAR로 가동하여 대시보드 바로 체험 가능하도록 함
      is_active: true,
      is_exempted: false,
      is_onboarded: true,
      show_pb: true,
      can_view_admin: false,
      can_edit_admin: false
    }
    return getStorageItem<Profile>('src_profile', defaultProfile)
  },

  saveProfile(profile: Profile): void {
    setStorageItem<Profile>('src_profile', profile)
  },

  // 2. 장소 목록 관리
  getLocations(): Location[] {
    return getStorageItem<Location[]>('src_locations', DEFAULT_LOCATIONS)
  },

  addLocation(name: string): Location {
    const locations = this.getLocations()
    const newLoc: Location = {
      id: `loc-${Date.now()}`,
      name,
      is_active: true
    }
    setStorageItem<Location[]>('src_locations', [...locations, newLoc])
    return newLoc
  },

  deleteLocation(id: string): void {
    const locations = this.getLocations()
    const updated = locations.map(loc => 
      loc.id === id ? { ...loc, is_active: false } : loc // Soft Delete 처리
    )
    setStorageItem<Location[]>('src_locations', updated)
  },

  // 3. 러닝 기록 관리
  getRunningRecords(): RunningRecord[] {
    if (typeof window === 'undefined') return [];
    const initialized = localStorage.getItem('src_running_records_all_v3')
    if (initialized) {
      return getStorageItem<RunningRecord[]>('src_running_records_all_v3', [])
    }

    const ym = getMockYearMonth()
    const myRecords = [
      {
        id: 'my-rec-1',
        user_id: 'mock-current-user',
        user_nickname: '김러너/96/남',
        user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        distance: 5.5,
        location_id: 'loc-1',
        location_name: '광교호수공원',
        date: `${ym}-12`,
        type: 'PERSONAL',
        is_pacer: false,
        likes: [],
        comments: []
      },
      {
        id: 'my-rec-2',
        user_id: 'mock-current-user',
        user_nickname: '김러너/96/남',
        user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        distance: 7.2,
        location_id: 'loc-2',
        location_name: '수원종합운동장',
        date: `${ym}-15`,
        type: 'REGULAR',
        is_pacer: false,
        likes: [],
        comments: []
      }
    ] as RunningRecord[]

    const seedRecords = getDynamicDefaultRecords().map(rec => ({
      ...rec,
      likes: [],
      comments: []
    })) as RunningRecord[]

    const all = [...myRecords, ...seedRecords].sort((a, b) => b.date.localeCompare(a.date))
    setStorageItem<RunningRecord[]>('src_running_records_all_v3', all)
    return all
  },

  addRunningRecord(record: Omit<RunningRecord, 'id' | 'user_id' | 'user_nickname' | 'user_avatar' | 'likes' | 'comments'>): RunningRecord {
    const profile = this.getProfile()
    const allRecords = this.getRunningRecords()
    
    const newRecord: RunningRecord = {
      ...record,
      id: `rec-${Date.now()}`,
      user_id: profile.id,
      user_nickname: profile.nickname,
      user_avatar: profile.avatar_url,
      likes: [],
      comments: []
    }

    const updated = [newRecord, ...allRecords]
    setStorageItem<RunningRecord[]>('src_running_records_all_v3', updated)
    return newRecord
  },

  deleteRunningRecord(id: string): void {
    const allRecords = this.getRunningRecords()
    const filtered = allRecords.filter(rec => rec.id !== id)
    setStorageItem<RunningRecord[]>('src_running_records_all_v3', filtered)
  },

  toggleLikeRunningRecord(recordId: string, userId: string): void {
    const allRecords = this.getRunningRecords()
    const updated = allRecords.map(rec => {
      if (rec.id === recordId) {
        const currentLikes = rec.likes || []
        const hasLiked = currentLikes.includes(userId)
        return {
          ...rec,
          likes: hasLiked ? currentLikes.filter(id => id !== userId) : [...currentLikes, userId]
        }
      }
      return rec
    })
    setStorageItem<RunningRecord[]>('src_running_records_all_v3', updated)
  },

  addCommentToRunningRecord(recordId: string, userId: string, text: string): void {
    const allRecords = this.getRunningRecords()
    const members = this.getMembers()
    const commenter = members.find(m => m.id === userId) || this.getProfile()

    const updated = allRecords.map(rec => {
      if (rec.id === recordId) {
        const currentComments = rec.comments || []
        const newComment = {
          id: `cmt-${Date.now()}`,
          user_id: userId,
          user_nickname: commenter.nickname,
          user_avatar: commenter.avatar_url,
          comment_text: text,
          created_at: new Date().toISOString()
        }
        return {
          ...rec,
          comments: [...currentComments, newComment]
        }
      }
      return rec
    })
    setStorageItem<RunningRecord[]>('src_running_records_all_v3', updated)
  },

  deleteCommentFromRunningRecord(recordId: string, commentId: string): void {
    const allRecords = this.getRunningRecords()
    const updated = allRecords.map(rec => {
      if (rec.id === recordId) {
        const currentComments = rec.comments || []
        return {
          ...rec,
          comments: currentComments.filter(c => c.id !== commentId)
        }
      }
      return rec
    })
    setStorageItem<RunningRecord[]>('src_running_records_all_v3', updated)
  },

  // 4. 내 마라톤 PB 관리
  getMarathonPBs(): MarathonPB[] {
    const defaultPBs: MarathonPB[] = [
      { id: 'pb-1', user_id: 'mock-current-user', category: '10K', record_time: '00:46:15' },
      { id: 'pb-2', user_id: 'mock-current-user', category: 'Half', record_time: '01:48:30' }
    ]
    return getStorageItem<MarathonPB[]>('src_my_pbs', defaultPBs)
  },

  saveMarathonPB(category: '10K' | 'Half' | 'Full', recordTime: string): void {
    const pbs = this.getMarathonPBs()
    const existingIndex = pbs.findIndex(pb => pb.category === category)
    
    if (existingIndex > -1) {
      pbs[existingIndex].record_time = recordTime
    } else {
      pbs.push({
        id: `pb-${Date.now()}`,
        user_id: 'mock-current-user',
        category,
        record_time: recordTime
      })
    }
    setStorageItem<MarathonPB[]>('src_my_pbs', pbs)
  },

  // 5. 전체 크루원 목록 조회 (온보딩 승인 제어 및 면제 제어용)
  getMembers(): Member[] {
    const profile = this.getProfile()
    const myPBs = this.getMarathonPBs()
    
    // 내 정보를 크루원 목록의 맨 앞에 결합
    const me: Member = {
      ...profile,
      pbs: myPBs.reduce((acc, pb) => ({ ...acc, [pb.category]: pb.record_time }), {})
    }

    const otherMembers = getStorageItem<Member[]>('src_other_members', DEFAULT_MEMBERS)
    return [me, ...otherMembers]
  },

  updateMemberRole(id: string, role: 'WAITING' | 'REGULAR' | 'PACER' | 'ADMIN'): void {
    const profile = this.getProfile()
    
    if (id === profile.id) {
      // 내 권한 변경
      profile.role = role
      this.saveProfile(profile)
    } else {
      // 타인 권한 변경
      const otherMembers = getStorageItem<Member[]>('src_other_members', DEFAULT_MEMBERS)
      const updated = otherMembers.map(m => m.id === id ? { ...m, role, nickname: `${m.real_name}/${m.birth_year.toString().slice(-2)}/${m.gender}` } : m)
      setStorageItem<Member[]>('src_other_members', updated)
    }
  },

  updateMemberExempted(id: string, is_exempted: boolean): void {
    const profile = this.getProfile()
    
    if (id === profile.id) {
      profile.is_exempted = is_exempted
      this.saveProfile(profile)
    } else {
      const otherMembers = getStorageItem<Member[]>('src_other_members', DEFAULT_MEMBERS)
      const updated = otherMembers.map(m => m.id === id ? { ...m, is_exempted } : m)
      setStorageItem<Member[]>('src_other_members', updated)
    }
  },

  updateMemberActive(id: string, is_active: boolean): void {
    const profile = this.getProfile()
    
    if (id === profile.id) {
      profile.is_active = is_active
      this.saveProfile(profile)
    } else {
      const otherMembers = getStorageItem<Member[]>('src_other_members', DEFAULT_MEMBERS)
      const updated = otherMembers.map(m => m.id === id ? { ...m, is_active } : m)
      setStorageItem<Member[]>('src_other_members', updated)
    }
  },

  updateMemberAdminPermissions(id: string, can_view_admin: boolean, can_edit_admin: boolean): void {
    const profile = this.getProfile()
    
    if (id === profile.id) {
      profile.can_view_admin = can_view_admin
      profile.can_edit_admin = can_edit_admin
      this.saveProfile(profile)
    } else {
      const otherMembers = getStorageItem<Member[]>('src_other_members', DEFAULT_MEMBERS)
      const updated = otherMembers.map(m => m.id === id ? { ...m, can_view_admin, can_edit_admin } : m)
      setStorageItem<Member[]>('src_other_members', updated)
    }
  },

  // 6. 건의사항 관리 모킹 함수들
  getSuggestions(): Suggestion[] {
    const ym = getMockYearMonth()
    const defaultSuggestions: Suggestion[] = [
      {
        id: 'sug-1',
        user_id: 'user-regular1',
        user_nickname: '박정회원/94/여',
        user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        user_real_name: '박정회원',
        title: '신대호수공원 코스 가이드라인 추가 문의',
        category: '기능 제안',
        content: '신대호수공원 달릴 때 훈련 코스 맵 가이드를 볼 수 있는 탭이 추가되면 좋을 것 같습니다. 정식 벙 뛸 때 페이서분들도 참고할 수 있어서 유용할 것 같아요!',
        is_anonymous: false,
        status: 'COMPLETED',
        reply_content: '좋은 건의 감사드립니다 박정회원님! 추후 업데이트 스케줄에 반영하여 GPX 지도뷰 기능과 연계해서 검토해보도록 하겠습니다.',
        reply_by: 'user-admin1',
        reply_by_nickname: '황운영/88/남',
        reply_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sug-2',
        user_id: 'user-pacer',
        user_nickname: '이페이서/98/남',
        user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        user_real_name: '이페이서',
        title: '페이스 기록 로딩 지연 현상',
        category: '앱 오류',
        content: '가끔 마이페이지 로딩 시 배지 분석이나 러닝 성장 곡선 불러올 때 로딩 바가 3초 이상 멈춰 있는 현상이 있습니다. 데이터가 많아져서 그런 걸까요?',
        is_anonymous: true,
        status: 'PENDING',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    return getStorageItem<Suggestion[]>('src_suggestions', defaultSuggestions)
  },

  addSuggestion(suggestion: Omit<Suggestion, 'id' | 'user_id' | 'user_nickname' | 'user_avatar' | 'user_real_name' | 'status' | 'created_at' | 'updated_at'>): Suggestion {
    const profile = this.getProfile()
    const all = this.getSuggestions()
    const newSug: Suggestion = {
      ...suggestion,
      id: `sug-${Date.now()}`,
      user_id: profile.id,
      user_nickname: profile.nickname,
      user_avatar: profile.avatar_url,
      user_real_name: profile.real_name || '김러너',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    const updated = [newSug, ...all]
    setStorageItem<Suggestion[]>('src_suggestions', updated)
    return newSug
  },

  replySuggestion(id: string, replyContent: string, status: 'PENDING' | 'INVESTIGATING' | 'COMPLETED' | 'REJECTED'): void {
    const profile = this.getProfile()
    const all = this.getSuggestions()
    const updated = all.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status,
          reply_content: replyContent,
          reply_by: profile.id,
          reply_by_nickname: profile.nickname,
          reply_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
      return s
    })
    setStorageItem<Suggestion[]>('src_suggestions', updated)
  },

  deleteSuggestion(id: string): void {
    const all = this.getSuggestions()
    const filtered = all.filter(s => s.id !== id)
    setStorageItem<Suggestion[]>('src_suggestions', filtered)
  },

  // 7. 가챠 보상 아이템 관리 모킹 함수들
  getGachaItems(): GachaItem[] {
    return getStorageItem<GachaItem[]>('src_gacha_items', DEFAULT_GACHA_ITEMS)
  },

  addGachaItem(item: Omit<GachaItem, 'id' | 'is_active'>): GachaItem {
    const all = this.getGachaItems()
    const newItem: GachaItem = {
      ...item,
      id: `gacha-${Date.now()}`,
      is_active: true
    }
    const updated = [...all, newItem]
    setStorageItem<GachaItem[]>('src_gacha_items', updated)
    return newItem
  },

  updateGachaItem(id: string, name: string, grade: 'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON', description: string, emoji: string, is_active: boolean): void {
    const all = this.getGachaItems()
    const updated = all.map(item => {
      if (item.id === id) {
        return {
          ...item,
          name,
          grade,
          description,
          emoji,
          is_active
        }
      }
      return item
    })
    setStorageItem<GachaItem[]>('src_gacha_items', updated)
  },

  deleteGachaItem(id: string): void {
    const all = this.getGachaItems()
    // Soft Delete (is_active = false)
    const updated = all.map(item => 
      item.id === id ? { ...item, is_active: false } : item
    )
    setStorageItem<GachaItem[]>('src_gacha_items', updated)
  }
}
