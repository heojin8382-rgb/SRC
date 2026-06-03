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
    <div className="min-h-screen bg-[#FFFFFF] text-slate-900 flex justify-center w-full relative overflow-hidden nike-grid-bg-light">
      {/* Dynamic Island style background typography for desktop */}
      <div className="hidden lg:flex fixed left-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0">
        <span className="text-[90px] font-black text-outline-black uppercase tracking-tighter leading-none select-none">
          SUWON
        </span>
        <span className="text-[90px] font-black text-[#84CC16] uppercase tracking-tighter leading-none select-none drop-shadow-[0_0_15px_rgba(132,204,22,0.12)]">
          RUNNING
        </span>
        <span className="text-[90px] font-black text-outline-black uppercase tracking-tighter leading-none select-none">
          CREW
        </span>
      </div>

      <div className="hidden lg:flex fixed right-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0 text-right">
        <span className="text-[90px] font-black text-outline-black uppercase tracking-tighter leading-none select-none">
          OWN
        </span>
        <span className="text-[90px] font-black text-slate-900 uppercase tracking-tighter leading-none select-none">
          YOUR
        </span>
        <span className="text-[90px] font-black text-outline-black uppercase tracking-tighter leading-none select-none">
          PACE
        </span>
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#84CC16]/3 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/2 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />

      {/* 
        모바일 퍼스트 쉘 (Mobile-First Shell)
        - PC 웹 브라우저에서도 최대 가로 폭 480px(max-w-md)로 모바일 앱 기기 형태로 중앙에 렌더링함
      */}
      <div className="w-full max-w-md bg-background border-x border-slate-200/80 min-h-screen pb-24 relative flex flex-col shadow-[0_8px_50px_rgba(15,23,42,0.06)] z-10">
        {/* Unified Nike Run Club Style Premium Light Blue Header */}
        <header className="bg-[#38BDF8] py-4 px-6 border-b border-[#0EA5E9] flex items-center justify-center shrink-0 overflow-hidden">
          <img 
            src="/logo.png" 
            alt="SRC Logo" 
            className="h-20 w-auto object-contain" 
            style={{ 
              mixBlendMode: 'screen',
              transform: 'scale(2.3)',
              filter: 'brightness(1.35) contrast(1.15)'
            }} 
          />
        </header>

        {children}
        <BottomNav />
        {/* 개발용 플로팅 역할 체인저 */}
        <RoleSwitcher />
      </div>
    </div>
  )
}
