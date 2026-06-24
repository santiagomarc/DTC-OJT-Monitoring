'use client'

import { GraduationCap, LogOut } from 'lucide-react'
import { logoutAction } from '@/actions/auth'
import type { Student } from '@/types'
import { ThemeToggle } from './ThemeToggle'

interface StudentHeaderProps {
  profile: Student
}

export function StudentHeader({ profile }: StudentHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-stone-200 bg-stone-50/80 px-6 backdrop-blur-md dark:border-white/10 dark:bg-stone-950/70">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-orange-600 shadow-md shadow-red-500/20">
          <GraduationCap className="h-5.5 w-5.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-black tracking-tight text-stone-900 dark:text-white uppercase">BatSU DTC</p>
          <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-widest">OJT Monitoring</p>
        </div>
      </div>

      {/* Right side: User Info, Theme Toggle, Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden text-right md:block">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Intern Account</p>
          <p className="text-sm font-bold text-stone-900 dark:text-white">
            {profile.first_name} {profile.last_name}
          </p>
        </div>

        <div className="h-8 w-px bg-stone-200 dark:bg-white/10 hidden md:block" />

        <ThemeToggle />

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl border border-transparent bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-500 hover:text-white dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  )
}
