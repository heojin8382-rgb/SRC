import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/layout/bottom-nav'
import RoleSwitcher from '@/components/layout/role-switcher'
import ParticleContainer from '@/components/ui/ParticleContainer'
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
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] flex justify-center w-full relative overflow-hidden nike-grid-bg">
      {/* Dynamic Island style background typography for desktop */}
      <div className="hidden lg:flex fixed left-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0">
        <span className="text-[90px] font-black text-outline-white uppercase tracking-tighter leading-none select-none">
          SUWON
        </span>
        <span className="text-[90px] font-black text-brand-neon uppercase tracking-tighter leading-none select-none drop-shadow-[0_0_20px_rgba(212,255,63,0.2)]">
          RUNNING
        </span>
        <span className="text-[90px] font-black text-outline-white uppercase tracking-tighter leading-none select-none">
          CREW
        </span>
      </div>

      <div className="hidden lg:flex fixed right-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0 text-right">
        <span className="text-[90px] font-black text-outline-white uppercase tracking-tighter leading-none select-none">
          OWN
        </span>
        <span className="text-[90px] font-black text-slate-100 uppercase tracking-tighter leading-none select-none">
          YOUR
        </span>
        <span className="text-[90px] font-black text-outline-white uppercase tracking-tighter leading-none select-none">
          PACE
        </span>
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-neon/5 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-aqua/5 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />

      {/* 
        모바일 퍼스트 쉘 (Mobile-First Shell)
        - PC 웹 브라우저에서도 최대 가로 폭 480px(max-w-md)로 모바일 앱 기기 형태로 중앙에 렌더링함
      */}
      <div className="w-full max-w-md bg-[#0D111A]/85 border-x border-white/5 min-h-screen pb-24 relative flex flex-col shadow-[0_8px_50px_rgba(0,0,0,0.5)] z-10 backdrop-blur-2xl">
        {/* Unified Nike Run Club Style Premium Dark Glassmorphic Header */}
        <header className="bg-slate-900/80 backdrop-blur-md py-4 px-6 border-b border-white/5 flex items-center justify-center shrink-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-neon/5 to-brand-aqua/5 opacity-50" />
          <img 
            src="/logo.png" 
            alt="SRC Logo" 
            className="h-20 w-auto object-contain relative z-10" 
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
        <ParticleContainer />
      </div>
    </div>
  )
}
