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
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#1E293B]/80 backdrop-blur-lg border-t border-slate-800/80 px-6 pb-2 z-50 flex items-center justify-around max-w-md mx-auto rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 group cursor-pointer transition-all duration-200"
          >
            <div
              className={`p-2 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-[#D4FF3F]/10 text-[#D4FF3F]'
                  : 'text-slate-500 group-hover:text-slate-300'
              }`}
            >
              <Icon
                className={`w-6 h-6 transition-transform duration-300 ${
                  isActive ? 'scale-110 shadow-[0_0_10px_rgba(212,255,63,0.2)]' : 'group-hover:scale-105'
                }`}
              />
            </div>
            <span
              className={`text-[10px] font-bold tracking-wider transition-colors duration-200 ${
                isActive ? 'text-[#D4FF3F]' : 'text-slate-500 group-hover:text-slate-300'
              }`}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
