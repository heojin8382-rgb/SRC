'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, Trophy, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: '대시보드',
      href: '/',
      icon: Home,
    },
    {
      label: '러닝인증',
      href: '/record',
      icon: PlusCircle,
    },
    {
      label: '크루원 PB',
      href: '/members',
      icon: Trophy,
    },
    {
      label: '내 기록',
      href: '/profile',
      icon: User,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 px-6 pb-2 z-50 flex items-center justify-around max-w-md mx-auto rounded-t-[2.5rem] shadow-[0_-8px_30px_rgba(15,23,42,0.06)]">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 group cursor-pointer transition-all duration-300 relative"
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-blue-500/10 text-blue-650 shadow-[0_0_12px_rgba(37,99,235,0.08)] border border-blue-500/20'
                  : 'text-slate-400 group-hover:text-slate-600 border border-transparent'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-all duration-300 ${
                  isActive ? 'scale-105' : 'group-hover:scale-105'
                }`}
              />
            </div>
            <span
              className={`text-[9px] font-black tracking-widest transition-colors duration-300 ${
                isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            >
              {item.label}
            </span>
            {isActive && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.6)]" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
