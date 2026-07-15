'use client'

import { Clock } from 'lucide-react'
import { useAttendanceSession } from '@/components/attendance/AttendanceSessionProvider'

export function ClockButton() {
  const { activeLog, elapsedLabel, isClockPending, toggleClock } = useAttendanceSession()
  const isActive = Boolean(activeLog)

  return (
    <button
      onClick={toggleClock}
      disabled={isClockPending}
      aria-live="polite"
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
        isActive
          ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-orange-500/25'
          : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/25'
      }`}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>{isClockPending ? 'Processing…' : isActive ? 'Clock Out' : 'Clock In'}</span>
      {elapsedLabel && <span className="hidden text-xs font-medium text-white/75 lg:inline">{elapsedLabel}</span>}
    </button>
  )
}
