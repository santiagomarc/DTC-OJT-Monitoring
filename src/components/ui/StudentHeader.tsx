'use client'

import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { logoutAction } from '@/actions/auth'
import type { Student } from '@/types'
import { ThemeToggle } from './ThemeToggle'
import { ClockButton } from './ClockButton'

interface StudentHeaderProps {
  profile: Student
}

export function StudentHeader({ profile }: StudentHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200 bg-stone-50/80 px-3 py-3 backdrop-blur-md dark:border-white/10 dark:bg-stone-950/70 sm:px-6 lg:flex lg:min-h-16 lg:items-center lg:justify-between lg:py-2">
      {/* Brand */}
      <div className="flex items-center justify-between gap-3 lg:contents">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Image src="/dtc-logo.png" alt="DTC Logo" width={160} height={40} priority className="h-10 w-auto shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-tight text-stone-900 dark:text-white">BatSU DTC</p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">OJT Monitoring</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:order-3">
          <div className="hidden text-right xl:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Intern Account</p>
            <p className="text-sm font-bold text-stone-900 dark:text-white">{profile.first_name} {profile.last_name}</p>
          </div>

          <div className="hidden h-8 w-px bg-stone-200 dark:bg-white/10 xl:block" />

          <ThemeToggle />

          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-2 rounded-xl border border-transparent bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-500 hover:text-white dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white">
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
      <div className="mt-3 lg:order-2 lg:mt-0"><ClockButton /></div>
    </header>
  )
}
