'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signInWithKakao() {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${origin}/auth/callback`,
      // scopes: 'profile_nickname profile_image' // 카카오 비인증 앱 기준 안전 스코프
    },
  })

  if (error) {
    console.error('Kakao login error:', error)
    throw new Error('카카오 로그인 연결에 실패했습니다.')
  }

  if (data.url) {
    redirect(data.url)
  }
}
