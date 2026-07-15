'use client'

import { LogIn } from 'lucide-react'
import type { AttendanceLog } from '@/types'

interface WelcomeCardProps {
  firstName: string
  program: string
  activeLog: AttendanceLog | null
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

export function WelcomeCard({
  firstName,
  program,
  activeLog,
}: WelcomeCardProps) {
  const isActive = !!activeLog

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 to-orange-700 p-8 text-white shadow-xl shadow-orange-500/10">
      {/* Abstract background blobs */}
      <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-orange-500/30 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Greeting */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Welcome back, {firstName} 👋
          </h1>
          <p className="max-w-2xl text-sm font-medium text-red-100 sm:text-base">
            Track your hours, submit daily logs, and monitor your overall progress in the {program} OJT Program.
          </p>
        </div>

        {/* Right: Clock In/Out Card */}
        <div className="shrink-0">
          <div
            className={`flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-md transition-all duration-300 min-w-[200px] ${
              isActive
                ? 'border-amber-300/30 bg-amber-400/15'
                : 'border-white/20 bg-white/10'
            }`}
          >
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`relative flex h-2.5 w-2.5 shrink-0 ${isActive ? 'visible' : 'invisible'}`}
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                {isActive ? 'Session Active' : 'Not Clocked In'}
              </span>
            </div>

            {/* Time label */}
            {isActive && activeLog?.time_in && (
              <div className="flex items-center gap-1.5 text-white/90">
                <LogIn className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="text-sm font-semibold">
                  Since {formatTime(activeLog.time_in)}
                </span>
              </div>
            )}

            <p className="text-xs font-medium text-white/75">Use the global clock control in the header to start or end your session.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
