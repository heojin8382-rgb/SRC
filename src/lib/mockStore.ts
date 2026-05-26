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

// 기본 인증 피드 시드 데이터 (2026년 5월 기준)
const DEFAULT_RECORDS: RunningRecord[] = [
  {
    id: 'rec-1',
    user_id: 'user-pacer',
    user_nickname: '이페이서/98/남',
    user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    distance: 5.2,
    location_id: 'loc-1',
    location_name: '광교호수공원',
    date: '2026-05-15',
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
    date: '2026-05-16',
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
    date: '2026-05-17',
    type: 'REGULAR',
    is_pacer: false
  }
]

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
    // 내 기록과 타인 시드 기록을 병합하여 로드
    const myRecords = getStorageItem<RunningRecord[]>('src_my_records', [
      {
        id: 'my-rec-1',
        user_id: 'mock-current-user',
        user_nickname: '김러너/96/남',
        user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        distance: 5.5,
        location_id: 'loc-1',
        location_name: '광교호수공원',
        date: '2026-05-12',
        type: 'PERSONAL',
        is_pacer: false
      },
      {
        id: 'my-rec-2',
        user_id: 'mock-current-user',
        user_nickname: '김러너/96/남',
        user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        distance: 7.2,
        location_id: 'loc-2',
        location_name: '수원종합운동장',
        date: '2026-05-15',
        type: 'REGULAR',
        is_pacer: false
      }
    ])
    return [...myRecords, ...DEFAULT_RECORDS].sort((a, b) => b.date.localeCompare(a.date))
  },

  addRunningRecord(record: Omit<RunningRecord, 'id' | 'user_id' | 'user_nickname' | 'user_avatar'>): RunningRecord {
    const profile = this.getProfile()
    const myRecords = getStorageItem<RunningRecord[]>('src_my_records', [])
    
    const newRecord: RunningRecord = {
      ...record,
      id: `rec-${Date.now()}`,
      user_id: profile.id,
      user_nickname: profile.nickname,
      user_avatar: profile.avatar_url
    }

    setStorageItem<RunningRecord[]>('src_my_records', [newRecord, ...myRecords])
    return newRecord
  },

  deleteRunningRecord(id: string): void {
    const myRecords = getStorageItem<RunningRecord[]>('src_my_records', [])
    const filtered = myRecords.filter(rec => rec.id !== id)
    setStorageItem<RunningRecord[]>('src_my_records', filtered)
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
  }
}
