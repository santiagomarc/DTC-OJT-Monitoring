'use client'

import Link from 'next/link'
import { GraduationCap, LogOut } from 'lucide-react'
import { logoutAction } from '@/actions/auth'
import type { Student } from '@/types'
import { ThemeToggle } from './ThemeToggle'

interface AdminHeaderProps {
  profile: Student
}

export function AdminHeader({ profile }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/80">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm shadow-violet-500/25">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900 dark:text-white">BatSU DTC</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Master Dashboard</p>
        </div>
      </div>

      {/* Right side: User Info, Theme Toggle, Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="text-xs capitalize text-gray-500 dark:text-gray-400">
            {profile.role}
          </p>
        </div>

        <div className="h-8 w-px bg-gray-200 dark:bg-white/10" />

        <ThemeToggle />

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl border border-transparent bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  )
}
