import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/layout/bottom-nav'
import RoleSwitcher from '@/components/layout/role-switcher'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                 process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' ||
                 cookieStore.get('src_mock')?.value === 'true'

  // Mock 모드가 아닐 때에만 실제 Supabase DB와 검증 진행
  if (!isMock) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_onboarded, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active || !profile.is_onboarded || profile.role === 'WAITING') {
      if (!profile || !profile.is_onboarded) {
        redirect('/setup-profile')
      } else {
        redirect('/waiting')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#F8FAFC] via-[#E2E8F0] to-[#F8FAFC] text-slate-900 flex justify-center w-full relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-blue-500/3 rounded-full blur-[120px] pointer-events-none animate-pulseGlow" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-emerald-500/2 rounded-full blur-[120px] pointer-events-none animate-pulseGlow" />

      {/* 
        모바일 퍼스트 쉘 (Mobile-First Shell)
        - PC 웹 브라우저에서도 최대 가로 폭 480px(max-w-md)로 모바일 앱 기기 형태로 중앙에 렌더링함
      */}
      <div className="w-full max-w-md bg-background border-x border-slate-200/80 min-h-screen pb-24 relative flex flex-col shadow-[0_0_50px_rgba(15,23,42,0.06)] z-10">
        {children}
        <BottomNav />
        {/* 개발용 플로팅 역할 체인저 */}
        <RoleSwitcher />
      </div>
    </div>
  )
}
