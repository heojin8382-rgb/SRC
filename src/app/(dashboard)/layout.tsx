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
    <div className="min-h-screen bg-[#050505] text-slate-900 flex justify-center w-full relative overflow-hidden nike-grid-bg">
      {/* Dynamic Island style background typography for desktop */}
      <div className="hidden lg:flex fixed left-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0">
        <span className="text-[110px] font-black text-zinc-900/30 uppercase tracking-tighter leading-none select-none">
          SUWON
        </span>
        <span className="text-[110px] font-black text-[#84CC16]/95 uppercase tracking-tighter leading-none select-none drop-shadow-[0_0_30px_rgba(132,204,22,0.15)]">
          RUNNING
        </span>
        <span className="text-[110px] font-black text-zinc-900/30 uppercase tracking-tighter leading-none select-none">
          CREW
        </span>
      </div>

      <div className="hidden lg:flex fixed right-[8%] top-1/2 -translate-y-1/2 flex-col gap-1 pointer-events-none select-none z-0 text-right">
        <span className="text-[110px] font-black text-zinc-900/30 uppercase tracking-tighter leading-none select-none">
          RUN
        </span>
        <span className="text-[110px] font-black text-zinc-900/30 uppercase tracking-tighter leading-none select-none">
          OR
        </span>
        <span className="text-[110px] font-black text-[#84CC16]/95 uppercase tracking-tighter leading-none select-none drop-shadow-[0_0_30px_rgba(132,204,22,0.15)]">
          DIE
        </span>
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#84CC16]/8 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/6 rounded-full blur-[140px] pointer-events-none animate-pulseGlow" />

      {/* 
        모바일 퍼스트 쉘 (Mobile-First Shell)
        - PC 웹 브라우저에서도 최대 가로 폭 480px(max-w-md)로 모바일 앱 기기 형태로 중앙에 렌더링함
      */}
      <div className="w-full max-w-md bg-background border-x border-zinc-900 min-h-screen pb-24 relative flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] z-10">
        {/* Unified Nike Run Club Style Premium Black Header */}
        <header className="bg-black py-5 px-6 border-b border-zinc-900 flex items-center justify-center shrink-0">
          <img src="/logo.png" alt="SRC Logo" className="h-14 w-auto object-contain" />
        </header>

        {children}
        <BottomNav />
        {/* 개발용 플로팅 역할 체인저 */}
        <RoleSwitcher />
      </div>
    </div>
  )
}
