'use client'

import { Clock, LogIn, CheckCircle2 } from 'lucide-react'
import type { AttendanceLog } from '@/types'
import { useAttendanceSession } from '@/components/attendance/AttendanceSessionProvider'

interface WelcomeCardProps {
  firstName: string
  program: string
  activeLog: AttendanceLog | null
  hasLoggedToday?: boolean
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
  hasLoggedToday = false,
}: WelcomeCardProps) {
  const { elapsedLabel, isClockPending, toggleClock } = useAttendanceSession()
  const isActive = !!activeLog
  const isCompletedToday = hasLoggedToday && !isActive

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

        {/* Right: Integrated Clock Panel */}
        <div className="shrink-0">
          <div
            className={`flex flex-col gap-4 rounded-2xl border p-5 backdrop-blur-md transition-all duration-300 min-w-[220px] ${
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
                {isActive ? 'Session Active' : isCompletedToday ? 'Session Logged' : 'Not Clocked In'}
              </span>
            </div>

            {/* Time & elapsed info */}
            {isActive && activeLog?.time_in && (
              <div className="flex items-center justify-between gap-3 text-white/90">
                <div className="flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="text-sm font-semibold">
                    Since {formatTime(activeLog.time_in)}
                  </span>
                </div>
                {elapsedLabel && (
                  <span className="text-xs font-medium text-white/60">
                    {elapsedLabel}
                  </span>
                )}
              </div>
            )}

            {/* Clock In/Out Button */}
            {isCompletedToday ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white shadow-inner">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-white/90">Completed for Today</span>
              </div>
            ) : (
              <button
                onClick={toggleClock}
                disabled={isClockPending}
                aria-live="polite"
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-black/10 hover:bg-white/30'
                    : 'bg-white text-red-700 shadow-black/10 hover:bg-white/90'
                }`}
              >
                <Clock className="h-4 w-4 shrink-0" />
                <span>{isClockPending ? 'Processing…' : isActive ? 'Clock Out' : 'Clock In'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
