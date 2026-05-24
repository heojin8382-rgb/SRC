'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function setupProfile(formData: FormData) {
  const supabase = await createClient()

  // 폼 입력 데이터 파싱
  const realName = (formData.get('realName') as string || '').trim()
  const birthYearStr = formData.get('birthYear') as string
  const gender = formData.get('gender') as string

  // 필수값 검증
  if (!realName || !birthYearStr || !gender) {
    return { success: false, error: '모든 항목을 정확하게 입력해주세요.' }
  }

  const birthYear = parseInt(birthYearStr, 10)
  if (isNaN(birthYear) || birthYear < 1930 || birthYear > 2020) {
    return { success: false, error: '올바른 출생년도를 선택해 주세요.' }
  }

  if (gender !== '남' && gender !== '여') {
    return { success: false, error: '올바른 성별을 선택해 주세요.' }
  }

  // 현재 로그인 유저 가져오기
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증 세션이 유효하지 않습니다. 다시 로그인해 주세요.' }
  }

  // "이름/출생년도2자리/성별" 형태의 가상 닉네임 생성 (예: 홍길동/95/남)
  const shortYear = birthYear.toString().slice(-2)
  const nickname = `${realName}/${shortYear}/${gender}`

  // profiles 테이블 업데이트
  const { error } = await supabase
    .from('profiles')
    .update({
      real_name: realName,
      birth_year: birthYear,
      gender: gender,
      nickname: nickname,
      is_onboarded: true,
      // 최초 가입자 트리거에 의해 어드민 지정이 되지 않은 일반 유저는 WAITING 상태로 머물게 됨
    })
    .eq('id', user.id)

  if (error) {
    console.error('Onboarding profile update failed:', error)
    return { success: false, error: '프로필 저장 중 서버 오류가 발생했습니다.' }
  }

  // 사전 등록 데이터 머지 진행 (RPC 호출)
  const { data: merged, error: rpcError } = await supabase
    .rpc('merge_preseeded_profile', { new_user_id: user.id, user_nickname: nickname })

  if (rpcError) {
    console.error('Pre-seeded profile merge failed:', rpcError)
  }

  // 성공 시 대시보드로 이동 (대기 상태 회원은 미들웨어가 자동으로 /waiting 으로 보냄)
  redirect('/')
}
