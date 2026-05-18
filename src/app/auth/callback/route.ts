import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    
    // 코드를 사용하여 세션 획득 및 교환 진행
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 획득한 세션의 유저 정보 추출
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 프로필 정보 조회하여 리다이렉트 분기 처리
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_onboarded, role')
          .eq('id', user.id)
          .single()

        // 온보딩을 완료하지 않은 사용자 -> 온보딩 설정 화면으로 이동
        if (!profile || !profile.is_onboarded) {
          return NextResponse.redirect(new URL('/setup-profile', request.url))
        }

        // 온보딩은 마쳤으나 WAITING 대기 상태인 사용자 -> 대기실 화면으로 이동
        if (profile.role === 'WAITING') {
          return NextResponse.redirect(new URL('/waiting', request.url))
        }
      }
    }
  }

  // 기본적으로 대시보드로 이동 (미들웨어가 필요 시 알아서 추가 검증 리다이렉트 수행)
  return NextResponse.redirect(new URL('/', request.url))
}
