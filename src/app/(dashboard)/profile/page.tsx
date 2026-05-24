'use client'

import { useState, useEffect } from 'react'
import { mockStore, Profile, RunningRecord } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Calendar, MapPin, Trash2, Footprints, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myRecords, setMyRecords] = useState<RunningRecord[]>([])

  const handleSignOut = async () => {
    if (confirm('로그아웃 하시겠습니까? 세션이 초기화되고 로그인 화면으로 이동합니다.')) {
      localStorage.removeItem('src_is_logged_in')
      
      const { checkIsMock: checkMock } = await import('@/lib/utils/mockCheck')
      if (!checkMock()) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase.auth.signOut()
      }
      
      window.location.href = '/login'
    }
  }
  
  // PB 시간 입력값 상태
  const [pb10k, setPb10k] = useState('')
  const [pbHalf, setPbHalf] = useState('')
  const [pbFull, setPbFull] = useState('')

  // 프로필 정보 수정 관련 상태
  const [editName, setEditName] = useState('')
  const [editBirthYear, setEditBirthYear] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // 피드백 알림 상태
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const isMockMode = checkIsMock()
    if (isMockMode) {
      const activeProfile = mockStore.getProfile()
      const activeRecords = mockStore.getRunningRecords()
      const activePBs = mockStore.getMarathonPBs()

      // 내 글만 필터링
      const filteredMyRecords = activeRecords.filter(rec => rec.user_id === activeProfile.id)
      
      setProfile(activeProfile)
      setMyRecords(filteredMyRecords)

      // 각 종목별 기존 PB 바인딩
      const pbMap = activePBs.reduce((acc, pb) => ({ ...acc, [pb.category]: pb.record_time }), {} as Record<string, string>)
      setPb10k(pbMap['10K'] || '')
      setPbHalf(pbMap['Half'] || '')
      setPbFull(pbMap['Full'] || '')
    } else {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: activeProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (!activeProfile) return

      const { data: dbRecords } = await supabase
        .from('running_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      const formattedRecords = (dbRecords || []).map((rec: any) => ({
        id: rec.id,
        user_id: rec.user_id,
        user_nickname: activeProfile.nickname || '신규 크루원',
        user_avatar: activeProfile.avatar_url || '',
        distance: Number(rec.distance),
        location_id: rec.location_id || '',
        location_name: rec.location_name,
        date: rec.date,
        type: rec.type,
        is_pacer: rec.is_pacer
      }))

      const { data: dbPBs } = await supabase
        .from('marathon_pbs')
        .select('*')
        .eq('user_id', user.id)

      setProfile(activeProfile as Profile)
      setMyRecords(formattedRecords)

      const pbMap = (dbPBs || []).reduce<Record<string, string>>((acc, pb: any) => ({ ...acc, [pb.category]: pb.record_time }), {})
      setPb10k(pbMap['10K'] || '')
      setPbHalf(pbMap['Half'] || '')
      setPbFull(pbMap['Full'] || '')
    }
  }

  // HH:MM:SS 포맷 정규식 유효성 검사 (시분초 유효성)
  const validateTimeFormat = (timeStr: string) => {
    if (!timeStr) return true // 빈 값 허용 (기록 삭제/없음)
    const timeRegex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/
    return timeRegex.test(timeStr)
  }

  const handleSavePBs = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile) return
    setErrorMsg(null)
    setSuccessMsg(null)

    // 1. 유효성 검증
    if (!validateTimeFormat(pb10k) || !validateTimeFormat(pbHalf) || !validateTimeFormat(pbFull)) {
      setErrorMsg('기록 시간 포맷은 반드시 HH:MM:SS (시:분:초) 양식으로 입력해야 합니다. (예: 00:45:30)')
      return
    }

    try {
      // 2. 스토어 저장
      const isMockMode = checkIsMock()
      if (isMockMode) {
        if (pb10k) mockStore.saveMarathonPB('10K', pb10k)
        if (pbHalf) mockStore.saveMarathonPB('Half', pbHalf)
        if (pbFull) mockStore.saveMarathonPB('Full', pbFull)
      } else {
        const supabase = createClient()
        const pbUpdates = []
        if (pb10k) pbUpdates.push({ user_id: profile.id, category: '10K', record_time: pb10k })
        if (pbHalf) pbUpdates.push({ user_id: profile.id, category: 'Half', record_time: pbHalf })
        if (pbFull) pbUpdates.push({ user_id: profile.id, category: 'Full', record_time: pbFull })

        if (pbUpdates.length > 0) {
          const { error } = await supabase
            .from('marathon_pbs')
            .upsert(pbUpdates, { onConflict: 'user_id,category' })
          if (error) throw error
        }
      }

      setSuccessMsg('마라톤 3대 최고 기록(PB)이 안전하게 저장되었습니다! PB 보드 랭킹이 즉시 갱신되었습니다. 🏆')
      setTimeout(() => setSuccessMsg(null), 3000)
      loadData()
    } catch {
      setErrorMsg('기록 업데이트 중 오류가 발생했습니다.')
    }
  }

  // 로컬 이미지 파일 선택 -> Base64 변환 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    // 용량 제한 1.5MB
    if (file.size > 1.5 * 1024 * 1024) {
      setErrorMsg('이미지 크기는 최대 1.5MB 이하여야 합니다.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setEditAvatarUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // 회원 프로필 정보 수정 완료 핸들러
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile) return
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!editName.trim()) {
      setErrorMsg('이름(실명)을 입력해 주세요.')
      return
    }
    if (!editBirthYear) {
      setErrorMsg('출생년도를 선택해 주세요.')
      return
    }
    if (!editGender) {
      setErrorMsg('성별을 선택해 주세요.')
      return
    }

    const shortYear = editBirthYear.slice(-2)
    const nextNickname = `${editName.trim()}/${shortYear}/${editGender}`

    const updatedProfile = {
      ...profile,
      real_name: editName.trim(),
      birth_year: parseInt(editBirthYear, 10),
      gender: editGender,
      nickname: nextNickname,
      avatar_url: editAvatarUrl.trim()
    }

    try {
      const isMockMode = checkIsMock()
      if (isMockMode) {
        mockStore.saveProfile(updatedProfile)
        setSuccessMsg('회원 프로필 정보가 안전하게 변경되었습니다! ⚙️')
        setTimeout(() => setSuccessMsg(null), 3000)
        setIsEditing(false)
        loadData()
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('profiles')
          .update({
            real_name: editName.trim(),
            birth_year: parseInt(editBirthYear, 10),
            gender: editGender,
            nickname: nextNickname,
            avatar_url: editAvatarUrl.trim()
          })
          .eq('id', profile.id)

        if (error) {
          setErrorMsg('서버 프로필 수정에 실패했습니다.')
        } else {
          setSuccessMsg('회원 프로필 정보가 안전하게 변경되었습니다! ⚙️')
          setTimeout(() => setSuccessMsg(null), 3000)
          setIsEditing(false)
          loadData()
        }
      }
    } catch {
      setErrorMsg('프로필 저장 중 예기치 못한 오류가 발생했습니다.')
    }
  }

  // 러닝 인증 기록 삭제 핸들러
  const handleDeleteRecord = async (id: string) => {
    if (confirm('이 러닝 인증 기록을 정말 삭제하시겠습니까?')) {
      const isMockMode = checkIsMock()
      if (isMockMode) {
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

  if (!profile) return null

  // 이번 달 누적 거리 및 출석일 통계 연산
  const totalDistance = myRecords.reduce((acc, rec) => acc + rec.distance, 0)
  const uniqueDates = Array.from(new Set(myRecords.map(rec => rec.date))).length

  const roleLabels: Record<string, string> = {
    WAITING: '대기회원 ⏳',
    REGULAR: '정회원 🔥',
    PACER: '크루 페이서 🎈',
    ADMIN: '크루 운영자 ⚡',
  }

  return (
    <div className="p-5 flex flex-col min-h-screen relative overflow-hidden select-none">
      {/* 배경 은은한 광원 효과 */}
      <div className="absolute top-[-10%] left-[-15%] w-[70%] h-[40%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-15%] w-[60%] h-[45%] bg-emerald-500/3 rounded-full blur-[100px] pointer-events-none" />

      {/* 타이틀 헤더 */}
      <header className="flex items-center justify-between mb-6 z-10 relative">
        <div className="flex flex-col">
          <h1 className="text-base font-black tracking-tight text-slate-900">마이페이지</h1>
          <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">My Profile & PBs</p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-600 hover:text-[#2563EB] rounded-xl text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 transition-all duration-300 cursor-pointer shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </header>

      {/* 1. 프로필 서머리 카드 */}
      <section className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 mb-6 shadow-sm flex items-center justify-between gap-4 z-10 relative">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-sm animate-fadeIn"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-lg text-slate-400 shadow-inner">
              👤
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-black text-slate-900">{profile.nickname}</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {/* 권한 뱃지 */}
              <span className="text-[9px] font-black tracking-wider bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-600">
                {roleLabels[profile.role] || '정회원'}
              </span>
              {/* 면제 뱃지 */}
              {profile.is_exempted && (
                <span className="text-[9px] font-black tracking-wider bg-cyan-555/10 text-cyan-600 border border-cyan-200 px-2.5 py-0.5 rounded-full">
                  🩹 부상 면제
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 프로필 정보 수정 버튼 */}
        <button
          onClick={() => {
            setEditName(profile.real_name || '')
            setEditBirthYear(profile.birth_year ? String(profile.birth_year) : '')
            setEditGender(profile.gender || '')
            setEditAvatarUrl(profile.avatar_url || '')
            setIsEditing(!isEditing)
            setErrorMsg(null)
            setSuccessMsg(null)
          }}
          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer shadow-sm border border-slate-200"
        >
          {isEditing ? '닫기' : '프로필 수정 ⚙️'}
        </button>
      </section>

      {/* 1.5 내 기본 정보 및 프로필 사진 수정 양식 */}
      {isEditing && (
        <section className="bg-white/90 border border-slate-200/80 rounded-3xl p-5 mb-6 shadow-sm z-10 relative animate-fadeIn">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">회원 정보 및 프로필 사진 변경</h2>
          </div>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* 프로필 이미지 선택 및 파일 업로드 */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-700 block">프로필 이미지 설정</label>
              
              {/* 아바타 미리보기 및 프리셋 아바타 */}
              <div className="flex items-center gap-4.5 mb-2">
                {editAvatarUrl ? (
                  <img src={editAvatarUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">👤</div>
                )}
                
                <div className="flex gap-2">
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&auto=format&fit=crop&q=80'
                  ].map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditAvatarUrl(presetUrl)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                        editAvatarUrl === presetUrl ? 'border-[#2563EB] scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={presetUrl} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditAvatarUrl('')}
                    className={`h-8 px-2 bg-slate-50 border text-[9px] font-bold rounded-lg cursor-pointer ${
                      !editAvatarUrl ? 'border-[#2563EB] text-[#2563EB] bg-blue-50' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    기본값
                  </button>
                </div>
              </div>

              {/* 기기에서 파일 직접 선택 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-slate-500 block">📸 기기에서 사진 직접 가져오기</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-[#2563EB]/10 file:text-[#2563EB] hover:file:bg-[#2563EB]/15 file:cursor-pointer"
                />
              </div>

              {/* 커스텀 URL 주소 직접 입력 */}
              <input
                type="text"
                placeholder="또는 이미지 주소(URL) 직접 입력"
                value={editAvatarUrl.startsWith('data:') ? '' : editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#2563EB] rounded-xl px-3 text-xs outline-none text-slate-800 font-semibold"
              />
            </div>

            {/* 실명 입력 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 block">이름 (실명)</label>
              <input
                type="text"
                placeholder="예: 홍길동"
                maxLength={10}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#2563EB] rounded-xl px-3 text-xs outline-none text-slate-800 font-semibold"
              />
            </div>

            {/* 출생년도 및 성별 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 block">출생년도</label>
                <select
                  value={editBirthYear}
                  onChange={(e) => setEditBirthYear(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#2563EB] rounded-xl px-2 text-xs outline-none text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="">년도 선택</option>
                  {Array.from({ length: 66 }, (_, i) => 2015 - i).map((year) => (
                    <option key={year} value={year}>{year}년생</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 block">성별</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditGender('남')}
                    className={`h-11 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editGender === '남'
                        ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]'
                        : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350'
                    }`}
                  >
                    남성
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditGender('여')}
                    className={`h-11 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editGender === '여'
                        ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]'
                        : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350'
                    }`}
                  >
                    여성
                  </button>
                </div>
              </div>
            </div>

            {/* 에러/성공 토스트 */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] rounded-xl text-center font-bold animate-fadeIn">
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-[#2563EB] text-[10px] rounded-xl text-center font-bold animate-fadeIn">
                ✓ {successMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-[#2563EB] text-white hover:bg-[#2563EB]/90 font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
            >
              정보 수정 완료
            </button>
          </form>
        </section>
      )}

      {/* 2. 이번 달 누적 활동 통계 피드 */}
      <section className="grid grid-cols-2 gap-4 mb-6 z-10 relative select-none">
        <div className="bg-white/80 border border-slate-200/80 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/10 flex items-center justify-center shrink-0">
            <Footprints className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">이달의 누적 거리</span>
            <span className="text-sm font-black text-slate-900 mt-0.5">{totalDistance.toFixed(1)} <span className="text-[10px] text-slate-500 font-bold uppercase">km</span></span>
          </div>
        </div>
        <div className="bg-white/80 border border-slate-200/80 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-650 border border-emerald-500/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">이달의 출석 일수</span>
            <span className="text-sm font-black text-slate-900 mt-0.5">{uniqueDates} <span className="text-[10px] text-slate-500 font-bold uppercase">일</span></span>
          </div>
        </div>
      </section>

      {/* 3. 마라톤 3대 최고 기록 (PB) 설정 관리 폼 */}
      <section className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 mb-6 shadow-sm z-10 relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-[#2563EB]" />
          </div>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">나의 마라톤 PB 기록 등록</h2>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
          공식 대회 최고 기록을 시:분:초(<strong className="text-slate-800">HH:MM:SS</strong>) 형태로 기입해 주세요.<br />
          예: <strong className="text-slate-800 font-bold">46분 15초</strong> ➔ <strong className="text-[#2563EB] font-bold">00:46:15</strong> | <strong className="text-slate-800 font-bold">3시간 45분</strong> ➔ <strong className="text-[#2563EB] font-bold">03:45:00</strong>
        </p>

        <form onSubmit={handleSavePBs} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* 10K 기록 */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block text-center">10K</label>
              <input
                type="text"
                placeholder="00:45:30"
                maxLength={8}
                value={pb10k}
                onChange={(e) => setPb10k(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-200 focus:border-[#2563EB] focus:shadow-[0_0_8px_rgba(37,99,235,0.1)] rounded-xl px-2 text-center text-xs outline-none text-slate-900 font-extrabold transition-all"
              />
            </div>
            {/* Half 기록 */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block text-center">Half</label>
              <input
                type="text"
                placeholder="01:45:00"
                maxLength={8}
                value={pbHalf}
                onChange={(e) => setPbHalf(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-200 focus:border-[#2563EB] focus:shadow-[0_0_8px_rgba(37,99,235,0.1)] rounded-xl px-2 text-center text-xs outline-none text-slate-900 font-extrabold transition-all"
              />
            </div>
            {/* Full 기록 */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block text-center">Full</label>
              <input
                type="text"
                placeholder="03:59:59"
                maxLength={8}
                value={pbFull}
                onChange={(e) => setPbFull(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-200 focus:border-[#2563EB] focus:shadow-[0_0_8px_rgba(37,99,235,0.1)] rounded-xl px-2 text-center text-xs outline-none text-slate-900 font-extrabold transition-all"
              />
            </div>
          </div>

          {/* 에러/성공 토스트 (PB 폼에서만 노출하기 위해 form 구분) */}
          {!isEditing && errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-255 text-rose-600 text-[10px] rounded-xl text-center font-bold animate-fadeIn">
              ⚠️ {errorMsg}
            </div>
          )}

          {!isEditing && successMsg && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-[#2563EB] text-[10px] rounded-xl text-center font-bold animate-fadeIn">
              ✓ {successMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-11 bg-[#2563EB] text-white hover:bg-[#2563EB]/90 font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center"
          >
            기록 저장 및 랭킹 반영
          </button>
        </form>
      </section>

      {/* 4. 내 기록 리스트 히스토리 피드 */}
      <section className="flex-1 flex flex-col z-10 relative select-none pb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-slate-500 tracking-widest font-black uppercase">내 러닝 활동 기록</span>
          <span className="text-[9px] text-[#2563EB] bg-[#2563EB]/5 border border-[#2563EB]/15 px-2.5 py-0.5 rounded-full font-black tracking-wider">
            {myRecords.length}회
          </span>
        </div>

        {myRecords.length === 0 ? (
          <div className="flex-1 min-h-[160px] bg-white/80 border border-slate-200/50 rounded-3xl flex flex-col items-center justify-center p-6 text-slate-400 text-center">
            <span className="text-sm">📪 이번 달 등록하신 내 활동 이력이 없습니다.</span>
            <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">Register your runs on dashboard</span>
          </div>
        ) : (
          <div className="space-y-3">
            {myRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white/85 backdrop-blur-md border border-slate-200/60 hover:bg-white/95 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-sm shrink-0 shadow-inner">
                    {rec.type === 'REGULAR' ? '👥' : '🏃'}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900">{rec.distance.toFixed(1)} km</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${
                        rec.type === 'REGULAR'
                          ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {rec.type === 'REGULAR' ? '정기 벙' : '개인런'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[9px] text-slate-500 font-semibold font-sans">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-[#2563EB]/60" />
                        {rec.location_name}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {rec.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 기록 삭제 */}
                <button
                  onClick={() => handleDeleteRecord(rec.id)}
                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  title="인증 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
