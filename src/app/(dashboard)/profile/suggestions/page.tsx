'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { mockStore, Suggestion } from '@/lib/mockStore'
import { checkIsMock } from '@/lib/utils/mockCheck'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MessageSquare, ChevronDown, ChevronUp, Image as ImageIcon, Send, X, AlertCircle } from 'lucide-react'

export default function SuggestionsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'list' | 'write'>('list')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  // 폼 입력 상태
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('일반 문의')
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  // 상태 메시지
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 목록 아코디언 상태
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const mockCheck = checkIsMock()
    setIsMock(mockCheck)
    loadData(mockCheck)
  }, [])

  const loadData = async (mockCheck: boolean) => {
    setLoading(true)
    if (mockCheck) {
      const profile = mockStore.getProfile()
      setUserProfile(profile)
      const allSugs = mockStore.getSuggestions()
      // 내 건의사항만 필터링
      const mySugs = allSugs.filter(s => s.user_id === profile.id)
      setSuggestions(mySugs)
      setLoading(false)
    } else {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      // 프로필 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setUserProfile(profile)

      // 건의사항 가져오기
      const { data: dbSugs, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && dbSugs) {
        // DB 필드 매핑
        const formatted: Suggestion[] = dbSugs.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          user_nickname: profile?.nickname || '크루원',
          user_avatar: profile?.avatar_url || '',
          user_real_name: profile?.real_name || '',
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
        setSuggestions(formatted)
      }
      setLoading(false)
    }
  }

  // 이미지 선택 시 Base64 변환 핸들러
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
        setImageUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // 건의사항 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setErrorMsg('제목과 내용을 모두 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (isMock) {
        mockStore.addSuggestion({
          title: title.trim(),
          category,
          content: content.trim(),
          is_anonymous: isAnonymous,
          image_url: imageUrl || undefined
        })
        setSuccessMsg('건의사항이 성공적으로 등록되었습니다. 💬')
        // 폼 초기화
        setTitle('')
        setCategory('일반 문의')
        setContent('')
        setIsAnonymous(false)
        setImageUrl(null)
        setActiveTab('list')
        loadData(true)
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('suggestions')
          .insert([{
            user_id: userProfile.id,
            title: title.trim(),
            category,
            content: content.trim(),
            is_anonymous: isAnonymous,
            image_url: imageUrl,
            status: 'PENDING'
          }])

        if (error) {
          setErrorMsg('서버 저장 중 오류가 발생했습니다.')
        } else {
          setSuccessMsg('건의사항이 성공적으로 등록되었습니다. 💬')
          setTitle('')
          setCategory('일반 문의')
          setContent('')
          setIsAnonymous(false)
          setImageUrl(null)
          setActiveTab('list')
          loadData(false)
        }
      }
    } catch (err) {
      setErrorMsg('제출 중 예기치 못한 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
    }
  }

  // 상태 배지 한글 매핑 및 스타일
  const statusConfig: Record<string, { label: string; style: string }> = {
    PENDING: { label: '대기 중', style: 'bg-orange-50 text-orange-600 border-orange-200' },
    INVESTIGATING: { label: '검토 중', style: 'bg-blue-50 text-blue-600 border-blue-200' },
    COMPLETED: { label: '답변 완료', style: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    REJECTED: { label: '반려됨', style: 'bg-rose-50 text-rose-600 border-rose-200' }
  }

  return (
    <div className="p-5 flex flex-col min-h-screen relative overflow-hidden bg-white select-none">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between mb-6 z-10 relative">
        <Link 
          href="/profile"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>마이페이지로 돌아가기</span>
        </Link>
        <span className="text-[9px] font-black tracking-widest text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/15 px-2.5 py-0.5 rounded-full">
          1:1 문의센터
        </span>
      </header>

      {/* 타이틀 정보 */}
      <div className="flex flex-col gap-1.5 mb-6 z-10 relative">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#2563EB]" />
          <h1 className="text-base font-black tracking-tight text-slate-800">건의사항 및 1:1 문의</h1>
        </div>
        <p className="text-[9px] text-slate-550 font-bold uppercase tracking-widest leading-relaxed">
          크루 운영진에게 바라는 점이나 앱 오류사항을 편하게 보내주세요.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <nav className="grid grid-cols-2 gap-2 bg-slate-100 border border-slate-200/85 p-1 rounded-2xl mb-6 z-10 relative shadow-inner">
        <button
          onClick={() => setActiveTab('list')}
          className={`py-2 rounded-xl text-[10px] font-black tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'list'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          내 문의 내역 ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('write')}
          className={`py-2 rounded-xl text-[10px] font-black tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'write'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          새 건의 등록 📝
        </button>
      </nav>

      {/* 메시지 피드백 */}
      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] rounded-xl text-center font-bold animate-fadeIn z-10 relative">
          ✓ {successMsg}
        </div>
      )}

      {/* 탭 콘텐츠 영역 */}
      <div className="z-10 relative flex-1 flex flex-col">
        {/* Tab 1: 문의 내역 목록 */}
        {activeTab === 'list' && (
          <div className="space-y-4 animate-fadeIn flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-xs text-slate-400 animate-pulse font-bold">건의 내역 로드 중...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200/60 rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                <MessageSquare className="w-6 h-6 text-slate-350 mb-2" />
                <span className="text-xs font-black text-slate-500">작성하신 건의사항이 없습니다.</span>
                <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">Your feedback list is empty</span>
              </div>
            ) : (
              <div className="space-y-3 pb-8">
                {suggestions.map((sug) => {
                  const isExpanded = expandedId === sug.id
                  const status = statusConfig[sug.status] || { label: sug.status, style: 'bg-slate-105 border-slate-200' }
                  
                  return (
                    <div 
                      key={sug.id} 
                      className={`bg-white border rounded-2xl shadow-sm transition-all duration-300 ${
                        isExpanded ? 'border-blue-450 ring-1 ring-blue-500/10' : 'border-slate-200'
                      }`}
                    >
                      {/* 목록 요약 영역 */}
                      <div 
                        onClick={() => toggleExpand(sug.id)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex flex-col gap-1 text-left min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.2 rounded text-slate-500">
                              {sug.category}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.2 rounded border ${status.style}`}>
                              {status.label}
                            </span>
                          </div>
                          <span className="text-xs font-black text-slate-900 truncate mt-1">
                            {sug.title}
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold">
                            작성일: {new Date(sug.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* 아코디언 상세 영역 */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-100 pt-3 text-left space-y-4 animate-fadeIn">
                          {/* 본문 내용 */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>작성자: {sug.is_anonymous ? '익명 크루원' : userProfile?.real_name || sug.user_nickname}</span>
                              {sug.is_anonymous && <span className="text-slate-455">🔒 비공개/익명</span>}
                            </div>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {sug.content}
                            </p>
                            
                            {/* 첨부 이미지 */}
                            {sug.image_url && (
                              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-60 bg-slate-50 flex justify-center items-center shadow-inner">
                                <img 
                                  src={sug.image_url} 
                                  alt="건의사항 첨부 이미지" 
                                  className="max-h-60 max-w-full object-contain"
                                />
                              </div>
                            )}
                          </div>

                          {/* 답변 섹션 */}
                          {sug.reply_content ? (
                            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1.5 shadow-inner">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-blue-600">💬 운영진 답변</span>
                                <span className="text-[8px] text-slate-400 font-bold">
                                  {new Date(sug.reply_at || sug.updated_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {sug.reply_content}
                              </p>
                              {sug.reply_by_nickname && (
                                <div className="text-right text-[8px] text-slate-400 font-bold">
                                  답변자: {sug.reply_by_nickname}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50/40 border border-slate-100 rounded-xl text-center text-slate-400">
                              <span className="text-[9px] font-bold">답변을 준비 중입니다. 잠시만 기다려 주세요! ⏳</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 새로운 건의 등록 폼 */}
        {activeTab === 'write' && (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn text-left pb-10">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] rounded-xl text-center font-bold flex items-center gap-1.5 shadow-sm">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 카테고리 선택 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">카테고리</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl px-3.5 text-xs text-slate-900 font-semibold transition-all cursor-pointer appearance-none shadow-sm"
                >
                  <option value="앱 오류">👾 앱 오류 제보</option>
                  <option value="기능 제안">💡 신규 기능 제안</option>
                  <option value="일반 문의">💬 일반 크루 문의</option>
                </select>
                <div className="absolute right-3.5 top-4 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>
            </div>

            {/* 건의사항 제목 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">제목</label>
              <input
                type="text"
                maxLength={80}
                placeholder="제목을 입력해 주세요 (최대 80자)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl px-3.5 text-xs text-slate-900 placeholder-slate-400 font-semibold transition-all shadow-sm"
              />
            </div>

            {/* 본문 내용 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">건의 내용</label>
              <textarea
                rows={6}
                maxLength={1000}
                placeholder="내용을 구체적으로 기입해 주세요. (최대 1000자)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#2563EB]/40 focus:outline-none rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 font-semibold transition-all leading-relaxed resize-none shadow-sm"
              />
            </div>

            {/* 익명 설정 토글 */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-slate-800">익명으로 작성하기</span>
                <span className="text-[8px] text-slate-500 font-bold">활성화 시 운영진에게 실명 대신 "익명 크루원"으로 표시됩니다.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${
                  isAnonymous ? 'bg-[#2563EB]' : 'bg-slate-350'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    isAnonymous ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 이미지 첨부 영역 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">사진 첨부 (선택)</label>
              
              {imageUrl ? (
                <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex justify-center items-center p-2 shadow-sm animate-fadeIn">
                  <img src={imageUrl} alt="Preview" className="max-h-48 object-contain rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-900 text-white rounded-full transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-[#2563EB]/40 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors relative shadow-inner">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500">클릭하여 이미지 파일 가져오기</span>
                  <span className="text-[8px] text-slate-450 mt-0.5">최대 용량 1.5MB 이하 (JPG, PNG 등)</span>
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full h-11 bg-[#2563EB] text-white hover:bg-[#2563EB]/95 font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? '등록 중...' : '건의 및 문의 등록하기'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
