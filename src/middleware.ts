import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Mock 모드 감지 (Supabase가 세팅되지 않았거나 쿠키로 강제 Mock 설정한 경우)
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                 process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' ||
                 request.cookies.get('src_mock')?.value === 'true'
  if (isMock) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // 정적 자산, API 라우트, OAuth 콜백 등은 미들웨어 검증에서 예외 처리
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/callback') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return response
  }

  // 1. 로그인하지 않은 사용자 제어
  if (!user) {
    if (pathname !== '/login') {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return response
  }

  // 2. 로그인 완료 사용자 프로필 확인 및 온보딩/역할 점검
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_onboarded, is_active')
    .eq('id', user.id)
    .single()

  const isOnboarded = profile?.is_onboarded ?? false
  const role = profile?.role ?? 'WAITING'
  const isActive = profile?.is_active ?? true

  // 2.1) 비활성화된 회원 (강퇴/탈퇴 등 Soft Deleted 유저)
  if (!isActive) {
    if (pathname !== '/waiting') {
      url.pathname = '/waiting'
      return NextResponse.redirect(url)
    }
    return response
  }

  // 2.2) 첫 가입자 온보딩 미완료 상태 (이름/출생년도/성별 입력 필요)
  if (!isOnboarded) {
    if (pathname !== '/setup-profile') {
      url.pathname = '/setup-profile'
      return NextResponse.redirect(url)
    }
    return response
  }

  // 2.3) 온보딩은 마쳤으나 운영자 승인 대기 상태
  if (role === 'WAITING') {
    if (pathname !== '/waiting') {
      url.pathname = '/waiting'
      return NextResponse.redirect(url)
    }
    return response
  }

  // 2.4) 정상 승인된 정회원/페이서/운영자가 로그인/온보딩/대기실에 진입하려 할 때 대시보드로 리다이렉트
  if (pathname === '/login' || pathname === '/setup-profile' || pathname === '/waiting') {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 2.5) 운영자 페이지 권한 제어
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, videos, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
