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
import { ThemeToggle } from './ThemeToggle'

interface SidebarProps {
  profile: Student
}

const studentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/logs', label: 'Attendance Logs', icon: ClipboardList },
]

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  // Ensure we only use studentNav here because Admin has its own layout
  const navItems = studentNav

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-900">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg shadow-sm shadow-violet-500/25">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900 dark:text-white">BatSU DTC</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">OJT Monitor</p>
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
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-600/20 dark:text-violet-300'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-white/10">
        <div className="mb-3 px-3">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="truncate text-xs capitalize text-gray-500 dark:text-gray-400">
            {profile.role}
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-1">
          <form action={logoutAction} className="flex-1">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-gray-500 transition-all hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
