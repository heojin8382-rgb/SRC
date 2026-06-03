'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { mockStore } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Sparkles, Trophy, AlertCircle, Check, HelpCircle } from 'lucide-react'
import { triggerReactionParticles } from '@/components/ui/ParticleContainer'

interface GameMember {
  id: string
  nickname: string
  avatar_url: string
}

export default function PlaygroundPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [members, setMembers] = useState<GameMember[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [memberDistances, setMemberDistances] = useState<Record<string, number>>({})
  const [useDistanceWeight, setUseDistanceWeight] = useState(true)
  const [loading, setLoading] = useState(true)

  // Roulette States
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [winner, setWinner] = useState<GameMember | null>(null)
  const wheelRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const isMock = checkIsMock()
      
      // Load current profile
      if (isMock) {
        setProfile(mockStore.getProfile())
        const activeMembers = mockStore.getMembers().filter(m => m.is_active)
        const activeRecords = mockStore.getRunningRecords()
        
        const distMap: Record<string, number> = {}
        activeMembers.forEach(m => {
          const myRecs = activeRecords.filter(r => r.user_id === m.id)
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
        }

        const { data: profilesList } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .eq('is_active', true)

        const { data: recordsList } = await supabase
          .from('running_records')
          .select('user_id, distance')

        const distMap: Record<string, number> = {}
        if (recordsList) {
          recordsList.forEach((r: any) => {
            distMap[r.user_id] = (distMap[r.user_id] || 0) + Number(r.distance)
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
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Weight formula: base 5 + max(0, 30 - distance)
  // Those who run less get larger slices (higher probability)
  const getWeight = (id: string) => {
    if (!useDistanceWeight) return 10 // Equal weights
    const distance = memberDistances[id] || 0
    const baseWeight = 5
    const distancePenalty = Math.max(0, 30 - distance)
    return baseWeight + distancePenalty
  }

  const selectedMembers = members.filter(m => selectedIds.includes(m.id))

  // Trigonometry drawing coordinates starting at 12 o'clock (-90 degrees)
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
      '#3B82F6', // blue
      '#10B981', // emerald
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#14B8A6', // teal
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

  // Spin Trigger
  const handleSpin = () => {
    if (spinning || selectedMembers.length < 2) return
    
    setSpinning(true)
    setWinner(null)
    
    const totalWeight = selectedMembers.reduce((sum, m) => sum + getWeight(m.id), 0)
    
    // Choose winner index based on weights
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
    
    // Calculate exact angles
    let accumulatedWeight = 0
    for (let i = 0; i < winnerIndex; i++) {
      accumulatedWeight += getWeight(selectedMembers[i].id)
    }
    const currentWeight = getWeight(chosenWinner.id)
    
    const startPercent = accumulatedWeight / totalWeight
    const centerPercent = (accumulatedWeight + currentWeight / 2) / totalWeight
    
    // Target rotation to align the center of the chosen slice with 12 o'clock pointer
    const centerAngle = centerPercent * 360
    const finalAngle = 360 - centerAngle
    
    // Add 5 full rotations (1800 degrees) for visual effect
    const newRotation = rotation + 1800 + (finalAngle - (rotation % 360))
    setRotation(newRotation)
    
    // Animate and complete after 4 seconds
    setTimeout(() => {
      setWinner(chosenWinner)
      setSpinning(false)
      
      // Trigger green/volt neon particle explosions
      if (wheelRef.current) {
        const rect = wheelRef.current.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        triggerReactionParticles(x, y, 'clap')
        triggerReactionParticles(x, y - 50, 'fire')
      }
    }, 4000)
  }

  const handleToggleSelect = (id: string) => {
    if (spinning) return
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (spinning) return
    setSelectedIds(members.map(m => m.id))
  }

  const handleClearAll = () => {
    if (spinning) return
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
          <span className="text-[8px] text-slate-400 font-extrabold tracking-widest uppercase">Playground Game #1</span>
          <h1 className="text-sm font-black tracking-tight text-slate-800">🥤 음료수 내기 복불복 룰렛</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-slate-400 animate-pulse">명단 데이터를 로딩 중...</span>
        </div>
      ) : (
        <div className="space-y-6 z-10 relative flex-1 flex flex-col">
          
          {/* A. 룰렛 비주얼 영역 */}
          <section className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
            {/* Pointer at the top */}
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
                {/* Wheel Outer Rim */}
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
                
                {/* Center Hub */}
                <circle cx="50" cy="50" r="8" fill="#FFFFFF" className="filter drop-shadow-sm" />
                <circle cx="50" cy="50" r="6" fill="#0F172A" />
              </svg>
            </div>

            {/* Spin Button */}
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

          {/* B. 당첨자 발표 배너 */}
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

          {/* C. 참가자 필터 옵션 */}
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

          {/* D. 참가자 명단 선택 */}
          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800">
                2. 오늘 참석한 크루원 선택 ({selectedIds.length} / {members.length}명)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  disabled={spinning}
                  className="text-[9px] font-black text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  전체 선택
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={spinning}
                  className="text-[9px] font-black text-slate-500 hover:text-rose-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  선택 해제
                </button>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-6">등록된 활성 크루 멤버가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 overflow-y-auto max-h-60 pr-1">
                {members.map(m => {
                  const isSelected = selectedIds.includes(m.id)
                  const dist = memberDistances[m.id] || 0
                  
                  // Compute probability percentage dynamically
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
                      } ${spinning ? 'pointer-events-none' : ''}`}
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
                            5월: {dist.toFixed(1)}k
                          </span>
                        </div>
                      </div>
                      
                      {isSelected && (
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
        </div>
      )}
    </div>
  )
}
