'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
  GraduationCap,
} from 'lucide-react'
import { logoutAction } from '@/actions/auth'
import type { Student } from '@/types'

interface SidebarProps {
  profile: Student
}

const studentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/logs', label: 'Attendance Logs', icon: ClipboardList },
]

const adminNav = [
  { href: '/dashboard/admin', label: 'Master Dashboard', icon: Users },
]

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const navItems = profile.role === 'admin' ? adminNav : studentNav

  return (
    <aside className="flex w-64 flex-col border-r border-white/10 bg-gray-900 p-4">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg shadow shadow-violet-500/25">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">BatSU DTC</p>
          <p className="text-xs text-gray-500">OJT Monitor</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="mb-3 px-3">
          <p className="truncate text-sm font-medium text-white">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="truncate text-xs text-gray-500 capitalize">{profile.role}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
