'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { mockStore, GachaItem, DEFAULT_GACHA_ITEMS } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Sparkles, Trophy, AlertCircle, Check, Play, UserCheck, Flame, HelpCircle, Search } from 'lucide-react'
import { triggerReactionParticles } from '@/components/ui/ParticleContainer'

interface GameMember {
  id: string
  nickname: string
  avatar_url: string
}

interface Mission {
  id: string
  category: 'DISTANCE' | 'POSE' | 'PACE'
  title: string
  text: string
  difficulty: '쉬움' | '보통' | '어려움'
}

const RANDOM_MISSIONS: Mission[] = [
  { id: 'm1', category: 'DISTANCE', title: '거리 복불복 🏃‍♂️', text: '오늘 내가 목표한 거리보다 딱 777m만 더 달리고 기록을 인증하세요!', difficulty: '쉬움' },
  { id: 'm2', category: 'POSE', title: '인증 포즈 복불복 📸', text: '오늘 러닝 인증샷으로 크루원들과 손가락 하트 모양을 만들고 사진을 업로드하세요!', difficulty: '쉬움' },
  { id: 'm3', category: 'PACE', title: '페이스 동기화 🤝', text: '오늘 함께 뛰는 짝꿍 크루원과 소수점 첫째 자리까지 완전히 동일한 거리로 러닝을 완료해 보세요. (예: 5.1k & 5.1k)', difficulty: '보통' },
  { id: 'm4', category: 'DISTANCE', title: '보너스 1km 런 ⛰️', text: '오늘 정기벙/개인런 코스 마지막에 전력 질주로 보너스 1km를 추가로 질주하세요.', difficulty: '보통' },
  { id: 'm5', category: 'POSE', title: '발도장 도장깨기 📸', text: '달리기 직후 크루원들과 둥글게 모여 러닝화 앞코를 맞대고 항공샷 발도장 사진을 찍어 업로드하세요!', difficulty: '쉬움' },
  { id: 'm6', category: 'PACE', title: '제로 페이스 맞추기 ⏱️', text: '오늘 내 평균 페이스의 초 단위를 0으로 끝내보세요. (예: 평균 페이스 5분 40초, 6분 10초 등)', difficulty: '어려움' },
  { id: 'm7', category: 'POSE', title: '볼트 세레머니 ⚡', text: '러닝 인증 사진으로 양손을 대각선 하늘로 찌르는 번개 볼트 세레머니 포즈를 취하고 사진을 찍으세요!', difficulty: '쉬움' },
  { id: 'm8', category: 'DISTANCE', title: '삼각 런 📐', text: 'GPS 맵 상에 깔끔한 삼각형 모양이 그려지도록 경로를 설계해서 달리고 인증샷을 올려보세요.', difficulty: '어려움' },
  { id: 'm9', category: 'POSE', title: '반사 거울 단체 샷 🪞', text: '오늘 러닝 중 코스에 있는 도로 반사 거울(볼록거울 등)을 발견하면, 크루원들과 다 함께 거울 셀카를 찍고 인증하세요!', difficulty: '쉬움' },
  { id: 'm10', category: 'POSE', title: '그림자 워리어 👤', text: '가로등 불빛이나 노을을 등지고 크루원들과 길게 늘어선 그림자 단체 샷을 찍어 인증하세요!', difficulty: '쉬움' },
  { id: 'm11', category: 'POSE', title: '공중 부양 점프 샷 🤸‍♀️', text: '러닝 코스의 랜드마크 앞에서 크루원 모두가 공중에 떠 있는 타이밍을 맞춰 단체 점프 샷을 촬영하세요!', difficulty: '보통' },
  { id: 'm12', category: 'POSE', title: '물약 충전! 포션 건배 🥤', text: '달리기가 끝난 뒤 시원한 음료수나 스포츠 음료 병을 모아 중앙에서 짠! 하는 건배 샷을 찍고 인증하세요!', difficulty: '쉬움' },
  { id: 'm13', category: 'DISTANCE', title: '러키 세븐 런 7️⃣', text: '오늘 최종 러닝 거리를 소수점 둘째 자리까지 정확하게 7.77km로 완성하고 스크린샷을 업로드하세요.', difficulty: '어려움' },
  { id: 'm14', category: 'DISTANCE', title: '생일 축하 런 🎂', text: '오늘 달리는 거리의 소수점 이하 단위를 내 생일 일자로 맞춰서 완료하세요! (예: 15일생이면 5.15km, 7일생이면 6.07km)', difficulty: '보통' }
]


export default function PlaygroundPage() {
  const router = useRouter()
  const [activeGame, setActiveGame] = useState<'roulette' | 'mission' | 'lottery' | 'gacha'>('roulette')
  const [profile, setProfile] = useState<any>(null)
  const [members, setMembers] = useState<GameMember[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [memberDistances, setMemberDistances] = useState<Record<string, number>>({})
  const [useDistanceWeight, setUseDistanceWeight] = useState(true)
  const [loading, setLoading] = useState(true)
  const [gameSearchTerm, setGameSearchTerm] = useState('')
  const [currentYearMonth, setCurrentYearMonth] = useState('2026-06')
  const [currentMonthDisplay, setCurrentMonthDisplay] = useState('6월')

  useEffect(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    setCurrentYearMonth(`${y}-${String(m).padStart(2, '0')}`)
    setCurrentMonthDisplay(`${m}월`)
  }, [])

  // 1. Roulette States
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [winner, setWinner] = useState<GameMember | null>(null)
  const wheelRef = useRef<SVGSVGElement>(null)

  // 2. Mission Draw States
  const [drawnMission, setDrawnMission] = useState<Mission | null>(null)
  const [envelopeSelected, setEnvelopeSelected] = useState<number | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<Mission | null>(null)

  // 3. Role Lottery States
  const [lotteryType, setLotteryType] = useState<'pacer' | 'leader'>('pacer')
  const [lotteryWinner, setLotteryWinner] = useState<GameMember | null>(null)
  const [drawingLottery, setDrawingLottery] = useState(false)
  const [cycleName, setCycleName] = useState('')
  const [pacerPending, setPacerPending] = useState(false)
  const [pacerSuccess, setPacerSuccess] = useState(false)

  // 4. Gacha States
  const [points, setPoints] = useState<number>(300)
  const [gachaSpinning, setGachaSpinning] = useState(false)
  const [gachaResult, setGachaResult] = useState<any | null>(null)
  const [gachaHistory, setGachaHistory] = useState<any[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null)
  const [gachaItems, setGachaItems] = useState<GachaItem[]>([])

  // Admin Gacha Management States
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [editingGachaId, setEditingGachaId] = useState<string | null>(null)
  const [gachaName, setGachaName] = useState('')
  const [gachaGrade, setGachaGrade] = useState<'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON'>('COMMON')
  const [gachaDescription, setGachaDescription] = useState('')
  const [gachaEmoji, setGachaEmoji] = useState('🎁')
  const [gachaIsActive, setGachaIsActive] = useState(true)

  useEffect(() => {
    loadData()
    // Load active challenge from storage
    const saved = localStorage.getItem('src_active_mission')
    if (saved) {
      try {
        setActiveChallenge(JSON.parse(saved))
      } catch (e) {}
    }

    // Load points & gacha history
    const savedPoints = localStorage.getItem('src_user_points')
    if (savedPoints) {
      setPoints(Number(savedPoints))
    } else {
      localStorage.setItem('src_user_points', '3')
      setPoints(3)
    }

    const savedHistory = localStorage.getItem('src_gacha_history')
    if (savedHistory) {
      try {
        setGachaHistory(JSON.parse(savedHistory))
      } catch (e) {}
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    const now = new Date()
    const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    try {
      const isMock = checkIsMock()
      let userId: string | null = null
      
      if (isMock) {
        const mockProfile = mockStore.getProfile()
        setProfile(mockProfile)
        userId = mockProfile.id
        const activeMembers = mockStore.getMembers().filter(m => m.is_active)
        const activeRecords = mockStore.getRunningRecords()
        
        const distMap: Record<string, number> = {}
        activeMembers.forEach(m => {
          const myRecs = activeRecords.filter(r => r.user_id === m.id && r.date.startsWith(targetMonth))
          distMap[m.id] = myRecs.reduce((sum, r) => sum + r.distance, 0)
        })
        setMemberDistances(distMap)
        setMembers(activeMembers.map(m => ({ id: m.id, nickname: m.nickname, avatar_url: m.avatar_url || '' })))
        setSelectedIds(activeMembers.map(m => m.id))
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: activeProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          setProfile(activeProfile)
          userId = activeProfile ? activeProfile.id : null
        }

        const { data: profilesList } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .eq('is_active', true)

        const { data: recordsList } = await supabase
          .from('running_records')
          .select('user_id, distance, date')

        const distMap: Record<string, number> = {}
        if (recordsList) {
          recordsList.forEach((r: any) => {
            if (r.date && r.date.startsWith(targetMonth)) {
              distMap[r.user_id] = (distMap[r.user_id] || 0) + Number(r.distance)
            }
          })
        }
        setMemberDistances(distMap)

        if (profilesList) {
          const mapped = profilesList.map((p: any) => ({
            id: p.id,
            nickname: p.nickname || '신규 크루원',
            avatar_url: p.avatar_url || ''
          }))
          setMembers(mapped)
          setSelectedIds(mapped.map(m => m.id))
        }
      }

      // Load all gacha items
      let allGacha: GachaItem[] = []
      if (isMock) {
        allGacha = mockStore.getGachaItems()
      } else {
        const supabase = createClient()
        const { data: dbGacha } = await supabase
          .from('gacha_items')
          .select('*')
          .order('created_at', { ascending: false })
        if (dbGacha) allGacha = dbGacha as GachaItem[]
      }
      setGachaItems(allGacha)

      // Sync user points with global membersCoins map in localStorage
      const savedCoinsMap = localStorage.getItem('src_members_coins')
      let userCoins = 3
      if (userId) {
        try {
          const parsedMap = savedCoinsMap ? JSON.parse(savedCoinsMap) : {}
          if (parsedMap[userId] !== undefined) {
            userCoins = parsedMap[userId]
          } else {
            parsedMap[userId] = 3
            localStorage.setItem('src_members_coins', JSON.stringify(parsedMap))
          }
        } catch (e) {}
      }
      setPoints(userCoins)
      localStorage.setItem('src_user_points', String(userCoins))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getWeight = (id: string) => {
    if (!useDistanceWeight) return 10
    const distance = memberDistances[id] || 0
    const baseWeight = 5
    const distancePenalty = Math.max(0, 30 - distance)
    return baseWeight + distancePenalty
  }

  const selectedMembers = members.filter(m => selectedIds.includes(m.id))

  const filteredMembers = members.filter(m =>
    m.nickname.toLowerCase().includes(gameSearchTerm.toLowerCase())
  )

  const getCoordinatesForPercent = (percent: number) => {
    const angle = 2 * Math.PI * percent - Math.PI / 2
    const x = Math.cos(angle)
    const y = Math.sin(angle)
    return [x, y]
  }

  // SVG Slices Generator
  const makeSvgSlices = () => {
    if (selectedMembers.length === 0) return null
    const totalWeight = selectedMembers.reduce((sum, m) => sum + getWeight(m.id), 0)
    
    let accumulatedPercent = 0
    const paths: React.ReactNode[] = []
    
    const sliceColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'
    ]

    selectedMembers.forEach((member, index) => {
      const weight = getWeight(member.id)
      const percent = weight / totalWeight
      
      const [startX, startY] = getCoordinatesForPercent(accumulatedPercent)
      accumulatedPercent += percent
      const [endX, endY] = getCoordinatesForPercent(accumulatedPercent)
      
      const largeArcFlag = percent > 0.5 ? 1 : 0
      
      const startPointX = 50 + startX * 45
      const startPointY = 50 + startY * 45
      const endPointX = 50 + endX * 45
      const endPointY = 50 + endY * 45
      
      const pathData = [
        `M 50 50`,
        `L ${startPointX} ${startPointY}`,
        `A 45 45 0 ${largeArcFlag} 1 ${endPointX} ${endPointY}`,
        `Z`
      ].join(' ')
      
      const middleAngle = 2 * Math.PI * (accumulatedPercent - percent / 2) - Math.PI / 2
      const textX = 50 + Math.cos(middleAngle) * 28
      const textY = 50 + Math.sin(middleAngle) * 28
      
      const textRotation = (middleAngle * 180) / Math.PI + 90
      const sliceColor = sliceColors[index % sliceColors.length]
      
      paths.push(
        <g key={member.id}>
          <path d={pathData} fill={sliceColor} stroke="#FFFFFF" strokeWidth="0.8" />
          {percent > 0.04 && (
            <text
              x={textX}
              y={textY}
              fill="#FFFFFF"
              fontSize="3"
              fontWeight="900"
              textAnchor="middle"
              alignmentBaseline="middle"
              transform={`rotate(${textRotation}, ${textX}, ${textY})`}
            >
              {member.nickname}
            </text>
          )}
        </g>
      )
    })
    
    return paths
  }

  // Spin Roulette
  const handleSpin = () => {
    if (spinning || selectedMembers.length < 2) return
    
    setSpinning(true)
    setWinner(null)
    
    const totalWeight = selectedMembers.reduce((sum, m) => sum + getWeight(m.id), 0)
    let randomVal = Math.random() * totalWeight
    let winnerIndex = 0
    let tempSum = 0
    
    for (let i = 0; i < selectedMembers.length; i++) {
      tempSum += getWeight(selectedMembers[i].id)
      if (randomVal <= tempSum) {
        winnerIndex = i
        break
      }
    }
    
    const chosenWinner = selectedMembers[winnerIndex]
    
    let accumulatedWeight = 0
    for (let i = 0; i < winnerIndex; i++) {
      accumulatedWeight += getWeight(selectedMembers[i].id)
    }
    const currentWeight = getWeight(chosenWinner.id)
    
    const centerPercent = (accumulatedWeight + currentWeight / 2) / totalWeight
    const centerAngle = centerPercent * 360
    const finalAngle = 360 - centerAngle
    const newRotation = rotation + 1800 + (finalAngle - (rotation % 360))
    setRotation(newRotation)
    
    setTimeout(() => {
      setWinner(chosenWinner)
      setSpinning(false)
      
      if (wheelRef.current) {
        const rect = wheelRef.current.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        triggerReactionParticles(x, y, 'clap')
        triggerReactionParticles(x, y - 50, 'fire')
      }
    }, 4000)
  }

  // Game 2: Mission Draw Handlers
  const handleDrawMission = (envelopeIdx: number, e: React.MouseEvent) => {
    if (drawnMission) return
    setEnvelopeSelected(envelopeIdx)
    triggerReactionParticles(e.clientX, e.clientY, 'lightning')
    
    setTimeout(() => {
      const randomMission = RANDOM_MISSIONS[Math.floor(Math.random() * RANDOM_MISSIONS.length)]
      setDrawnMission(randomMission)
    }, 450)
  }

  const handleStartChallenge = (mission: Mission) => {
    localStorage.setItem('src_active_mission', JSON.stringify(mission))
    setActiveChallenge(mission)
    alert(`🎯 "${mission.title}" 미션에 도전합니다! 대시보드와 러닝 기록 인증 화면에서 도전 현황을 확인할 수 있습니다.`)
  }

  const handleAbandonChallenge = () => {
    if (confirm('현재 도전 중인 러닝 미션을 정말 포기하시겠습니까?')) {
      localStorage.removeItem('src_active_mission')
      setActiveChallenge(null)
    }
  }

  const handleResetDraw = () => {
    setDrawnMission(null)
    setEnvelopeSelected(null)
  }

  // Game 3: Role Lottery Draw Handlers
  const handleStartRoleLottery = () => {
    if (selectedMembers.length === 0 || drawingLottery) return
    setDrawingLottery(true)
    setLotteryWinner(null)
    setPacerSuccess(false)

    let elapsed = 0
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * selectedMembers.length)
      setCycleName(selectedMembers[randomIdx].nickname)
      elapsed += 80

      if (elapsed >= 2000) {
        clearInterval(interval)
        const finalWinner = selectedMembers[Math.floor(Math.random() * selectedMembers.length)]
        setLotteryWinner(finalWinner)
        setDrawingLottery(false)
        triggerReactionParticles(window.innerWidth / 2, window.innerHeight / 2, 'lightning')
      }
    }, 80)
  }

  // Register Pacer Record to database/mockStore for Role Lottery
  const handleGrantPacerRecord = async () => {
    if (!lotteryWinner) return
    setPacerPending(true)

    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    const isMock = checkIsMock()
    try {
      if (isMock) {
        const allRecords = mockStore.getRunningRecords()
        const targetMember = mockStore.getMembers().find(m => m.id === lotteryWinner.id) || mockStore.getProfile()
        const newRecord = {
          id: `rec-${Date.now()}`,
          user_id: lotteryWinner.id,
          user_nickname: targetMember.nickname,
          user_avatar: targetMember.avatar_url,
          distance: 3.0,
          location_id: 'loc-1',
          location_name: '정기 벙 (추첨 페이서)',
          date: todayStr,
          type: 'REGULAR' as const,
          is_pacer: true,
          likes: [],
          comments: []
        }
        localStorage.setItem('src_running_records_all_v2', JSON.stringify([newRecord, ...allRecords]))
        loadData()
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('running_records')
          .insert([{
            user_id: lotteryWinner.id,
            distance: 3.0,
            location_id: null,
            location_name: '정기 벙 (추첨 페이서)',
            date: todayStr,
            type: 'REGULAR',
            is_pacer: true,
            proof_image_url: ''
          }])
        if (error) throw error
      }
      setPacerSuccess(true)
      alert(`🎉 ${lotteryWinner.nickname} 님에게 페이서 봉사 기록(3km)이 부여되어 '봉사왕 페이서' 뱃지가 잠금 해제되었습니다!`)
    } catch (e) {
      console.error(e)
      alert('기록 등록에 실패했습니다.')
    } finally {
      setPacerPending(false)
    }
  }

  // Gacha point logic
  const handleEarnPoints = (amount: number) => {
    const nextPoints = points + amount
    setPoints(nextPoints)
    localStorage.setItem('src_user_points', String(nextPoints))

    // Sync back to global map
    const savedCoinsMap = localStorage.getItem('src_members_coins')
    if (savedCoinsMap && profile) {
      try {
        const parsedMap = JSON.parse(savedCoinsMap)
        parsedMap[profile.id] = nextPoints
        localStorage.setItem('src_members_coins', JSON.stringify(parsedMap))
      } catch (e) {}
    }

    triggerReactionParticles(window.innerWidth / 2, window.innerHeight / 2, 'fire')
    alert(`🎉 미션 완료 보상으로 ${amount} 코인을 획득했습니다! 현재 코인: ${nextPoints}개`)
  }

  const handleDrawGacha = (e: React.MouseEvent) => {
    if (gachaSpinning) return
    if (points < 1) {
      alert('코인이 부족합니다! 운영진에게 코인 지급을 요청하세요.')
      return
    }

    const nextPoints = points - 1
    setPoints(nextPoints)
    localStorage.setItem('src_user_points', String(nextPoints))

    // Update global members coins map
    const savedCoinsMap = localStorage.getItem('src_members_coins')
    if (savedCoinsMap && profile) {
      try {
        const parsedMap = JSON.parse(savedCoinsMap)
        parsedMap[profile.id] = nextPoints
        localStorage.setItem('src_members_coins', JSON.stringify(parsedMap))
      } catch (e) {}
    }

    setGachaSpinning(true)
    setGachaResult(null)
    triggerReactionParticles(e.clientX, e.clientY, 'lightning')

    setTimeout(() => {
      const rand = Math.random() * 100
      let chosen: any

      const activeGachaItems = gachaItems.filter(item => item.is_active)
      const legendaryItems = activeGachaItems.filter(item => item.grade === 'LEGENDARY')
      const epicItems = activeGachaItems.filter(item => item.grade === 'EPIC')
      const rareItems = activeGachaItems.filter(item => item.grade === 'RARE')
      const commonItems = activeGachaItems.filter(item => item.grade === 'COMMON')

      let chosenList: GachaItem[] = []
      if (rand < 1.0) {
        chosenList = legendaryItems.length > 0 ? legendaryItems : (epicItems.length > 0 ? epicItems : (rareItems.length > 0 ? rareItems : commonItems))
      } else if (rand < 4.0) {
        chosenList = epicItems.length > 0 ? epicItems : (rareItems.length > 0 ? rareItems : (legendaryItems.length > 0 ? legendaryItems : commonItems))
      } else if (rand < 9.0) {
        chosenList = rareItems.length > 0 ? rareItems : (commonItems.length > 0 ? commonItems : (epicItems.length > 0 ? epicItems : legendaryItems))
      } else {
        chosenList = commonItems.length > 0 ? commonItems : (rareItems.length > 0 ? rareItems : (epicItems.length > 0 ? epicItems : legendaryItems))
      }

      if (chosenList.length === 0) {
        alert('현재 활성화된 뽑기 보상이 없습니다. 운영진에게 문의하세요.')
        setGachaSpinning(false)
        // Refund the coin
        const refundedPoints = points
        const nextPoints = refundedPoints + 1
        setPoints(nextPoints)
        localStorage.setItem('src_user_points', String(nextPoints))
        const savedCoinsMap = localStorage.getItem('src_members_coins')
        if (savedCoinsMap && profile) {
          try {
            const parsedMap = JSON.parse(savedCoinsMap)
            parsedMap[profile.id] = nextPoints
            localStorage.setItem('src_members_coins', JSON.stringify(parsedMap))
          } catch (e) {}
        }
        return
      }

      chosen = chosenList[Math.floor(Math.random() * chosenList.length)]

      setGachaResult(chosen)
      setGachaSpinning(false)

      const newHistory = [{ ...chosen, timestamp: new Date().toLocaleTimeString('ko-KR') }, ...gachaHistory].slice(0, 10)
      setGachaHistory(newHistory)
      localStorage.setItem('src_gacha_history', JSON.stringify(newHistory))

      if (chosen.grade === 'LEGENDARY' || chosen.grade === 'EPIC') {
        triggerReactionParticles(window.innerWidth / 2, window.innerHeight / 2, 'fire')
        triggerReactionParticles(window.innerWidth / 2, window.innerHeight / 2 - 50, 'clap')
      }
    }, 2000)
  }

  // Admin Gacha CRUD Handlers
  const hasEditPermission = profile?.role === 'ADMIN' || profile?.can_edit_admin

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
      const isMock = checkIsMock()
      if (editingGachaId) {
        // 수정 모드
        if (isMock) {
          mockStore.updateGachaItem(editingGachaId, gachaName.trim(), gachaGrade, gachaDescription.trim(), gachaEmoji.trim(), gachaIsActive)
          alert('보상이 수정되었습니다.')
          loadData()
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
            loadData()
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
          loadData()
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
            loadData()
          }
        }
      }
      handleCancelEditGacha()
    } catch (err) {
      console.error(err)
      alert('저장 중 오류가 발생했습니다.')
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
        const isMock = checkIsMock()
        if (isMock) {
          mockStore.deleteGachaItem(id)
          alert('보상이 삭제되었습니다.')
          loadData()
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
            loadData()
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
      const isMock = checkIsMock()
      if (isMock) {
        mockStore.updateGachaItem(item.id, item.name, item.grade, item.description, item.emoji, !item.is_active)
        loadData()
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('gacha_items')
          .update({ is_active: !item.is_active })
          .eq('id', item.id)

        if (error) {
          alert('상태 변경에 실패했습니다.')
        } else {
          loadData()
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleImportDefaultGachaItems = async () => {
    if (!hasEditPermission) {
      alert('수정 권한이 없습니다. 최고 운영자에게 문의해 주세요.')
      return
    }

    if (!confirm('기본 보상 17개를 일괄 등록하시겠습니까? (이미 같은 이름으로 등록된 보상은 건너뜁니다.)')) return

    try {
      const isMock = checkIsMock()
      if (isMock) {
        const all = mockStore.getGachaItems()
        const existingNames = all.map(x => x.name)
        const toAdd = DEFAULT_GACHA_ITEMS.filter(x => !existingNames.includes(x.name))
        
        if (toAdd.length === 0) {
          alert('이미 모든 기본 보상이 등록되어 있습니다.')
          return
        }

        toAdd.forEach(item => {
          mockStore.addGachaItem({
            name: item.name,
            grade: item.grade,
            description: item.description,
            emoji: item.emoji
          })
        })
        alert(`🎉 ${toAdd.length}개의 기본 보상이 성공적으로 등록되었습니다!`)
        loadData()
      } else {
        const supabase = createClient()
        const { error: checkError } = await supabase
          .from('gacha_items')
          .select('id')
          .limit(1)

        if (checkError && checkError.code === 'PGRST205') {
          alert('❌ 데이터베이스에 gacha_items 테이블이 존재하지 않습니다.\n안내해 드린 SQL 스크립트를 Supabase SQL Editor에서 먼저 실행한 뒤 버튼을 눌러주세요.')
          return
        }

        const { data: existing } = await supabase
          .from('gacha_items')
          .select('name')

        const existingNames = existing ? existing.map((x: any) => x.name) : []
        const toAdd = DEFAULT_GACHA_ITEMS.filter(x => !existingNames.includes(x.name))

        if (toAdd.length === 0) {
          alert('이미 모든 기본 보상이 등록되어 있습니다.')
          return
        }

        const insertData = toAdd.map(item => ({
          name: item.name,
          grade: item.grade,
          description: item.description,
          emoji: item.emoji,
          is_active: true
        }))

        const { error } = await supabase
          .from('gacha_items')
          .insert(insertData)

        if (error) {
          console.error(error)
          alert('보상 일괄 등록에 실패했습니다.')
        } else {
          alert(`🎉 ${toAdd.length}개의 기본 보상이 성공적으로 등록되었습니다!`)
          loadData()
        }
      }
    } catch (err) {
      console.error(err)
      alert('일괄 등록 중 오류가 발생했습니다.')
    }
  }

  const handleToggleSelect = (id: string) => {
    if (spinning || drawingLottery) return
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (spinning || drawingLottery) return
    setSelectedIds(members.map(m => m.id))
  }

  const handleClearAll = () => {
    if (spinning || drawingLottery) return
    setSelectedIds([])
  }

  return (
    <div className="p-5 flex flex-col min-h-screen relative overflow-hidden select-none bg-white">
      
      {/* 1. 상단 백버튼 및 헤더 */}
      <header className="flex items-center gap-3 mb-6 z-10 relative">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-400 font-extrabold tracking-widest uppercase">Playground Game Zone</span>
          <h1 className="text-sm font-black tracking-tight text-slate-800">🎲 크루 복불복 오락실</h1>
        </div>
      </header>

      {/* 2. 게임 선택 세그먼트 제어기 */}
      <section className="bg-slate-100 border border-slate-200 p-1.5 rounded-2xl grid grid-cols-4 gap-1.5 mb-6 shadow-inner z-10 relative">
        <button
          disabled={spinning || drawingLottery || gachaSpinning}
          onClick={() => setActiveGame('roulette')}
          className={`py-2 rounded-xl text-[9px] font-black tracking-widest transition-all duration-300 cursor-pointer ${
            activeGame === 'roulette'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'
          }`}
        >
          🥤 음료 룰렛
        </button>
        <button
          disabled={spinning || drawingLottery || gachaSpinning}
          onClick={() => setActiveGame('mission')}
          className={`py-2 rounded-xl text-[9px] font-black tracking-widest transition-all duration-300 cursor-pointer ${
            activeGame === 'mission'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'
          }`}
        >
          🏃‍♂️ 미션 뽑기
        </button>
        <button
          disabled={spinning || drawingLottery || gachaSpinning}
          onClick={() => setActiveGame('lottery')}
          className={`py-2 rounded-xl text-[9px] font-black tracking-widest transition-all duration-300 cursor-pointer ${
            activeGame === 'lottery'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'
          }`}
        >
          🎈 역할 추첨
        </button>
        <button
          disabled={spinning || drawingLottery || gachaSpinning}
          onClick={() => setActiveGame('gacha')}
          className={`py-2 rounded-xl text-[9px] font-black tracking-widest transition-all duration-300 cursor-pointer ${
            activeGame === 'gacha'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'
          }`}
        >
          🪙 코인 뽑기
        </button>
      </section>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-slate-400 animate-pulse">크루 정보를 불러오는 중...</span>
        </div>
      ) : (
        <div className="space-y-6 z-10 relative flex-1 flex flex-col">

          {/* ==================== GAME 1: 음료수 내기 룰렛 ==================== */}
          {activeGame === 'roulette' && (
            <>
              <section className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden animate-fadeIn">
                {/* Pointer */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                  <div className="w-4 h-4 bg-rose-500 rotate-45 border-r border-b border-white shadow-md transform origin-center" />
                  <div className="w-1.5 h-3 bg-rose-600 rounded-b shadow-sm -mt-1" />
                </div>

                <div className="w-56 h-56 relative flex items-center justify-center mt-3">
                  <svg
                    ref={wheelRef}
                    viewBox="0 0 100 100"
                    className="w-full h-full drop-shadow-lg"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.3, 1)' : 'none'
                    }}
                  >
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                    <circle cx="50" cy="50" r="46.5" fill="#F8FAFC" />
                    
                    {selectedMembers.length >= 2 ? (
                      makeSvgSlices()
                    ) : (
                      <g>
                        <circle cx="50" cy="50" r="45" fill="#F1F5F9" />
                        <text x="50" y="52" fill="#94A3B8" fontSize="4.5" fontWeight="bold" textAnchor="middle">
                          참가자 2명 이상 선택
                        </text>
                      </g>
                    )}
                    <circle cx="50" cy="50" r="8" fill="#FFFFFF" className="filter drop-shadow-sm" />
                    <circle cx="50" cy="50" r="6" fill="#0F172A" />
                  </svg>
                </div>

                <button
                  disabled={spinning || selectedMembers.length < 2}
                  onClick={handleSpin}
                  className={`mt-5 w-36 h-10 rounded-full font-black text-xs tracking-wider uppercase transition-all duration-300 shadow-md ${
                    spinning
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : selectedMembers.length < 2
                      ? 'bg-slate-100 text-slate-350 border border-slate-200 cursor-not-allowed shadow-none'
                      : 'bg-[#2563EB] text-white hover:bg-[#2563EB]/95 active:scale-97 cursor-pointer hover:shadow-lg'
                  }`}
                >
                  {spinning ? '회전 중...' : '룰렛 돌리기 🎯'}
                </button>
              </section>

              {winner && (
                <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-amber-200/60 p-4.5 rounded-3xl animate-bounceIn flex flex-col items-center text-center shadow-md">
                  <Sparkles className="w-6 h-6 text-amber-500 animate-pulse mb-1.5" />
                  <span className="text-[8px] text-rose-500 font-extrabold uppercase tracking-widest">Congratulations</span>
                  <h2 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">
                    🎉 오늘의 당첨자: <span className="text-rose-600 font-black">{winner.nickname}</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    오늘 모임의 주인공이 되셨습니다! 음료수를 부탁해요~ 🥤🏃‍♂️
                  </p>
                </div>
              )}
            </>
          )}

          {/* ==================== GAME 2: 오늘의 러닝 랜덤 미션 ==================== */}
          {activeGame === 'mission' && (
            <div className="space-y-6 animate-fadeIn">
              {/* 현재 진행 중인 미션 표시 */}
              {activeChallenge && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                      🎯
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] text-amber-600 font-extrabold uppercase tracking-widest">현재 도전 중인 미션</span>
                      <h4 className="text-xs font-black text-slate-800 tracking-tight">{activeChallenge.title}</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{activeChallenge.text}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleAbandonChallenge}
                    className="text-[9px] font-black text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100/60 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    미션 포기
                  </button>
                </div>
              )}

              {/* 미션 드로우 영역 */}
              <section className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center">
                <div className="text-center mb-5">
                  <h3 className="text-xs font-black text-slate-800">✉️ 오늘의 랜덤 러닝 미션 뽑기</h3>
                  <p className="text-[8px] text-slate-400 font-extrabold tracking-wide uppercase mt-1">Select a card to reveal your mission</p>
                </div>

                {!drawnMission ? (
                  <div className="flex justify-center gap-4 w-full py-4">
                    {[1, 2, 3].map((envelopeIdx) => (
                      <button
                        key={envelopeIdx}
                        onClick={(e) => handleDrawMission(envelopeIdx, e)}
                        className={`w-24 h-36 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg flex flex-col items-center justify-center text-white border border-white/20 transition-all duration-300 hover:-translate-y-2 active:scale-95 cursor-pointer relative group ${
                          envelopeSelected !== null && envelopeSelected !== envelopeIdx ? 'opacity-35 scale-95' : ''
                        }`}
                      >
                        <div className="absolute inset-0 bg-black/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-2xl animate-pulse">🧧</span>
                        <span className="text-[9px] font-black tracking-wider uppercase mt-2">미션 {envelopeIdx}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-inner flex flex-col items-center text-center animate-scaleUp">
                    <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full border mb-3 ${
                      drawnMission.difficulty === '쉬움'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : drawnMission.difficulty === '보통'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      난이도: {drawnMission.difficulty}
                    </span>
                    
                    <h3 className="text-sm font-black text-slate-800 tracking-tight mb-2">
                      {drawnMission.title}
                    </h3>
                    
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/50 p-4 rounded-xl mb-4 w-full">
                      "{drawnMission.text}"
                    </p>

                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => handleStartChallenge(drawnMission)}
                        className="flex-1 h-10 bg-[#2563EB] text-white hover:bg-[#2563EB]/95 font-black text-xs rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                      >
                        🎯 이 미션에 도전하기
                      </button>
                      <button
                        onClick={handleResetDraw}
                        className="h-10 bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 px-4 font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                      >
                        다시 뽑기
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ==================== GAME 3: 다음 벙 페이서 / 번개 방장 추첨기 ==================== */}
          {activeGame === 'lottery' && (
            <div className="space-y-6 animate-fadeIn">
              <section className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                
                {/* 추첨 종류 선택 */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl w-60 justify-center gap-1 mb-5">
                  <button
                    disabled={drawingLottery}
                    onClick={() => { setLotteryType('pacer'); setLotteryWinner(null); setPacerSuccess(false); }}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                      lotteryType === 'pacer' ? 'bg-[#2563EB] text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🎈 페이서 추첨
                  </button>
                  <button
                    disabled={drawingLottery}
                    onClick={() => { setLotteryType('leader'); setLotteryWinner(null); setPacerSuccess(false); }}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                      lotteryType === 'leader' ? 'bg-[#2563EB] text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ⚡ 번개 방장 추첨
                  </button>
                </div>

                {/* 추첨 애니메이션 영역 */}
                <div className="w-56 h-36 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 bg-white shadow-inner">
                  {drawingLottery ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xl animate-spin">🌀</span>
                      <span className="text-xs font-black text-blue-600 animate-pulse">{cycleName}</span>
                      <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wide">추첨 후보 셔플 중...</span>
                    </div>
                  ) : lotteryWinner ? (
                    <div className="flex flex-col items-center text-center gap-1.5 animate-scaleUp">
                      {lotteryWinner.avatar_url ? (
                        <img src={lotteryWinner.avatar_url} alt="Winner" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-sm border border-slate-200">👤</div>
                      )}
                      <h4 className="text-xs font-black text-slate-800">
                        {lotteryType === 'pacer' ? '🎈 당첨 페이서: ' : '⚡ 당첨 번개방장: '}
                        <span className="text-[#2563EB]">{lotteryWinner.nickname}</span>
                      </h4>
                      <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-wide">당첨을 축하합니다!</span>
                    </div>
                  ) : (
                    <div className="text-center flex flex-col gap-1 text-slate-400">
                      <HelpCircle className="w-6 h-6 mx-auto text-slate-300" />
                      <span className="text-[10px] font-bold">참가자를 지정하고 추첨을 시작하세요</span>
                    </div>
                  )}
                </div>

                <button
                  disabled={drawingLottery || selectedMembers.length === 0}
                  onClick={handleStartRoleLottery}
                  className={`mt-5 w-36 h-10 rounded-full font-black text-xs tracking-wider uppercase transition-all duration-300 shadow-md ${
                    drawingLottery
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : selectedMembers.length === 0
                      ? 'bg-slate-100 text-slate-350 border border-slate-200 cursor-not-allowed shadow-none'
                      : 'bg-[#2563EB] text-white hover:bg-[#2563EB]/95 active:scale-97 cursor-pointer hover:shadow-lg'
                  }`}
                >
                  {drawingLottery ? '추첨 중...' : '추첨 시작 🎲'}
                </button>
              </section>

              {/* 당첨자 연동 혜택 (페이서 임명 기록 즉시 등록) */}
              {lotteryWinner && lotteryType === 'pacer' && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/80 p-4.5 rounded-3xl animate-fadeIn flex flex-col gap-3 shadow-sm">
                  <div className="flex gap-2 items-start text-[10px] text-blue-650 leading-relaxed font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                    <span>
                      <strong className="text-slate-800 font-black">역할 추첨 연동 혜택:</strong> 아래 버튼을 누르면 당첨 회원에게 3.0km의 페이서 기록이 자동 부여되어 <strong className="text-[#2563EB]">‘봉사왕 페이서’ 뱃지</strong>를 즉시 획득하게 됩니다.
                    </span>
                  </div>

                  <button
                    disabled={pacerPending || pacerSuccess}
                    onClick={handleGrantPacerRecord}
                    className={`w-full h-10 font-black text-xs tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                      pacerSuccess
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default'
                        : pacerPending
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-[#2563EB] text-white hover:bg-[#2563EB]/95 active:scale-98 cursor-pointer'
                    }`}
                  >
                    {pacerSuccess ? '✓ 페이서 기록 부여 완료!' : pacerPending ? '페이서 임명 처리 중...' : '🎈 페이서 봉사 기록 자동 등록 (배지 부여)'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================== GAME 4: 코인 뽑기방 (Gacha) ==================== */}
          {activeGame === 'gacha' && (
            <div className="space-y-6 animate-fadeIn">
              {/* 코인 지갑 HUD */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-5 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl text-white">
                    🪙
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-amber-100 font-extrabold uppercase tracking-widest">My Crew Points</span>
                    <h4 className="text-sm font-black text-white tracking-tight">보유 코인: {points} COIN</h4>
                  </div>
                </div>
                
                {/* 운영진 버튼 영역 */}
                {(profile?.role === 'ADMIN' || profile?.can_edit_admin) && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEarnPoints(1)}
                      className="bg-white text-orange-600 hover:bg-orange-50 font-black text-[9px] px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-97"
                    >
                      ⚡ 가상 미션 완료 (+1 코인)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminPanel(!showAdminPanel)
                        handleCancelEditGacha()
                      }}
                      className="bg-slate-900 text-white hover:bg-slate-800 border border-white/20 font-black text-[9px] px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-97 flex items-center gap-1"
                    >
                      ⚙️ {showAdminPanel ? '뽑기 화면으로' : '보상 관리'}
                    </button>
                  </div>
                )}
              </div>

              {!showAdminPanel ? (
                /* 캡슐 머신 본체 */
                <section className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="text-center mb-4">
                    <h3 className="text-xs font-black text-slate-800">🎟️ 크루 이색 혜택 뽑기방</h3>
                    <p className="text-[8px] text-slate-400 font-extrabold tracking-wide uppercase mt-1">Spend 1 coin to spin for rare prizes</p>
                  </div>

                  {/* 캡슐 머신 그래픽 영역 */}
                  <div className="w-48 h-48 bg-white border border-slate-200 rounded-3xl relative flex flex-col items-center justify-center p-4 shadow-inner overflow-hidden">
                    {gachaSpinning ? (
                      <div className="flex flex-col items-center gap-3">
                        {/* Bouncing capsules simulation */}
                        <div className="flex gap-2.5 animate-bounce">
                          <span className="text-3xl filter drop-shadow">🔴</span>
                          <span className="text-3xl filter drop-shadow">🔵</span>
                          <span className="text-3xl filter drop-shadow">🟡</span>
                        </div>
                        <span className="text-xs font-black text-orange-500 animate-pulse mt-2">두구두구... 캡슐 믹싱 중!</span>
                      </div>
                    ) : gachaResult ? (
                      <div
                        onClick={() => setSelectedHistoryItem(gachaResult)}
                        className="flex flex-col items-center text-center gap-2 animate-scaleUp w-full cursor-pointer hover:opacity-85 transition-opacity"
                        title="크게 보기 (캡처용)"
                      >
                        <div className="text-4xl filter drop-shadow animate-wiggle">🎁</div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${
                          gachaResult.grade === 'LEGENDARY'
                            ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : gachaResult.grade === 'EPIC'
                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                            : gachaResult.grade === 'RARE'
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {gachaResult.grade}
                        </span>
                        
                        <h4 className="text-xs font-black text-slate-800 tracking-tight leading-snug">
                          {gachaResult.name}
                        </h4>
                        <p className="text-[9px] text-slate-500 leading-relaxed font-semibold px-2">
                          {gachaResult.description || gachaResult.desc}
                        </p>
                        <span className="text-[7.5px] text-slate-400 font-extrabold tracking-wider mt-0.5">
                          🔍 클릭하여 크게 보기 (캡처)
                        </span>
                      </div>
                    ) : (
                      <div className="text-center flex flex-col gap-2 text-slate-400">
                        <div className="text-4xl">🎪</div>
                        <span className="text-[10px] font-bold">1회 뽑기당 1 코인이 사용됩니다.</span>
                      </div>
                    )}

                    {/* 믹싱 실시간 발광 백그라운드 효과 */}
                    {gachaSpinning && (
                      <div className="absolute inset-0 bg-orange-500/5 backdrop-blur-[1px] animate-pulse" />
                    )}
                  </div>

                  <button
                    disabled={gachaSpinning || points < 1}
                    onClick={(e) => handleDrawGacha(e)}
                    className={`mt-6 w-44 h-11 rounded-full font-black text-xs tracking-wider uppercase transition-all duration-300 shadow-md ${
                      gachaSpinning
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : points < 1
                        ? 'bg-slate-100 text-slate-350 border border-slate-200 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-orange-50 to-amber-50 border border-slate-200 hover:border-slate-300 font-black text-slate-850 active:scale-97 cursor-pointer hover:shadow-lg'
                    }`}
                  >
                    {gachaSpinning ? '추첨 중...' : '1코인으로 뽑기 🎲'}
                  </button>
                </section>
              ) : (
                /* 운영진 보상 관리 패널 */
                <div className="space-y-6 animate-fadeIn text-left">
                  {/* 등록/수정 폼 */}
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
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
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black text-slate-700">전체 보상 목록 ({gachaItems.length}개)</span>
                      {hasEditPermission && (
                        <button
                          type="button"
                          onClick={handleImportDefaultGachaItems}
                          className="text-[8.5px] font-black text-[#2563EB] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          📦 기본 보상 로드
                        </button>
                      )}
                    </div>

                    {gachaItems.length === 0 ? (
                      <div className="bg-white border border-slate-200 py-10 rounded-3xl text-center text-slate-400 text-xs font-bold shadow-sm space-y-3 px-4">
                        <p>등록되었거나 활성화된 가챠 보상이 없습니다.</p>
                        {hasEditPermission && (
                          <button
                            type="button"
                            onClick={handleImportDefaultGachaItems}
                            className="py-2 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#2563EB] rounded-xl text-[9px] font-black cursor-pointer transition-all shadow-sm block mx-auto active:scale-97"
                          >
                            📦 기본 보상 17개 일괄 가져오기
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-3 grid-cols-1">
                        {gachaItems.map((item) => {
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
                                    {item.description || (item as any).desc}
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
                </div>
              )}

              {/* 최근 뽑기 내역 */}
              <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
                <h3 className="text-xs font-black text-slate-800">📜 최근 당첨 내역 (최대 10개)</h3>
                
                {gachaHistory.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4">아직 당첨 이력이 없습니다. 첫 뽑기를 완료하세요!</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {gachaHistory.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedHistoryItem(item)}
                        className="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-350 rounded-xl cursor-pointer transition-all duration-200"
                        title="클릭하여 대형 인증서 보기 (캡처용)"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-800">{item.name}</span>
                          <span className="text-[8px] text-slate-400 font-medium">{item.timestamp} 당첨</span>
                        </div>
                        <span className={`text-[7px] font-black px-1.5 py-0.2 rounded border uppercase ${
                          item.grade === 'LEGENDARY'
                            ? 'bg-amber-100 text-amber-600 border-amber-250'
                            : item.grade === 'EPIC'
                            ? 'bg-purple-100 text-purple-600 border-purple-250'
                            : item.grade === 'RARE'
                            ? 'bg-blue-100 text-blue-600 border-blue-250'
                            : item.grade === 'slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {item.grade}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ==================== C. 공통 설정 영역 (Game 1, 3, 4에서 가리기 위해 condition 수정) ==================== */}
          {activeGame !== 'mission' && activeGame !== 'gacha' && (
            <>
              {activeGame === 'roulette' && (
                <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-xs font-black text-slate-800">1. 러닝량 비례 확률 가중치 적용</h3>
                      <span className="text-[8px] text-slate-500 font-bold">
                        활성화 시, 이달의 러닝 거리가 적은 사람의 룰렛 지분이 넓어집니다! ⚖️
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => !spinning && setUseDistanceWeight(!useDistanceWeight)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                        useDistanceWeight ? 'bg-[#2563EB]' : 'bg-slate-300'
                      } ${spinning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                          useDistanceWeight ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {useDistanceWeight && (
                    <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl flex gap-2 items-start text-[10px] text-blue-650 leading-relaxed font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                      <span>
                        <strong className="text-slate-800 font-black">달려야 산다 법칙:</strong> 30km 이하로 달린 크루원들은 덜 달린 수치만큼 패널티 확률 지분이 추가로 부과됩니다. (30km 이상 러너는 최소 기본 확률만 적용)
                      </span>
                    </div>
                  )}
                </section>
              )}

              {/* D. 참가자 명단 선택 */}
              <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 flex-1 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800">
                    2. 오늘 참석한 크루원 선택 ({selectedIds.length} / {members.length}명)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      disabled={spinning || drawingLottery}
                      className="text-[9px] font-black text-slate-550 hover:text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={handleClearAll}
                      disabled={spinning || drawingLottery}
                      className="text-[9px] font-black text-slate-555 hover:text-rose-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      선택 해제
                    </button>
                  </div>
                </div>

                {/* 검색 바 */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="이름으로 크루원 검색..."
                    value={gameSearchTerm}
                    onChange={(e) => setGameSearchTerm(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#2563EB] focus:bg-white transition-all text-slate-800 font-semibold"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  {gameSearchTerm && (
                    <button
                      onClick={() => setGameSearchTerm('')}
                      className="absolute right-2.5 top-2.2 text-slate-400 hover:text-slate-600 font-extrabold text-[10px] cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {filteredMembers.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-6">
                    {members.length === 0 ? "등록된 활성 크루 멤버가 없습니다." : "검색 결과가 없습니다."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 overflow-y-auto max-h-60 pr-1">
                    {filteredMembers.map(m => {
                      const isSelected = selectedIds.includes(m.id)
                      const dist = memberDistances[m.id] || 0
                      
                      const totalWeight = selectedMembers.reduce((sum, sm) => sum + getWeight(sm.id), 0)
                      const currentWeight = getWeight(m.id)
                      const probability = isSelected && totalWeight > 0 
                        ? Math.round((currentWeight / totalWeight) * 100) 
                        : 0

                      return (
                        <div
                          key={m.id}
                          onClick={() => handleToggleSelect(m.id)}
                          className={`p-2.5 border rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#2563EB] bg-blue-50/20 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 opacity-60'
                          } ${spinning || drawingLottery ? 'pointer-events-none' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] border border-slate-200">👤</div>
                              )}
                              {isSelected && (
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#2563EB] border border-white rounded-full flex items-center justify-center shadow-sm">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-black text-slate-800">{m.nickname}</span>
                              <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-wide">
                                {currentMonthDisplay}: {dist.toFixed(1)}k
                              </span>
                            </div>
                          </div>
                          
                          {isSelected && activeGame === 'roulette' && (
                            <div className="text-right">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border ${
                                probability >= 30 
                                  ? 'bg-rose-50 text-rose-600 border-rose-200' 
                                  : probability >= 15
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              }`}>
                                {probability}%
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </>
          )}

        </div>
      )}

      {/* 3. 당첨 상세 모달 (캡처용) */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 select-none animate-fadeIn">
          <div className="bg-white border-2 border-amber-300 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-scaleUp">
            {/* Watermark / Background Deco */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-slate-50 rounded-full opacity-35 pointer-events-none" />
            <div className="absolute -left-8 -top-8 w-32 h-32 bg-slate-50 rounded-full opacity-35 pointer-events-none" />
            
            {/* Ribbon/Crown Icon */}
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shadow-sm mb-4 animate-bounce">
              {selectedHistoryItem.emoji || '🎁'}
            </div>

            <span className="text-[9px] text-[#2563EB] font-black uppercase tracking-widest bg-blue-50 border border-blue-150 px-2.5 py-0.5 rounded-full mb-3">
              Suwon Running Crew Certificate
            </span>
            
            <h2 className="text-sm font-black text-slate-900 tracking-tight leading-snug mb-3">
              {selectedHistoryItem.name}
            </h2>
            
            <div className="w-full border-t border-dashed border-slate-200 my-2" />
            
            <p className="text-[11px] font-semibold text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/50 p-4.5 rounded-2xl my-3 w-full text-left">
              {selectedHistoryItem.description || selectedHistoryItem.desc}
            </p>
            
            <div className="w-full border-t border-dashed border-slate-200 my-2" />

            <div className="flex flex-col gap-1 my-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">당첨 일시</span>
              <span className="text-[10px] text-slate-700 font-extrabold">{currentMonthDisplay} {selectedHistoryItem.timestamp || '당첨 완료'}</span>
            </div>

            <button
              onClick={() => setSelectedHistoryItem(null)}
              className="mt-5 w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-97 cursor-pointer"
            >
              확인 (닫기)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
