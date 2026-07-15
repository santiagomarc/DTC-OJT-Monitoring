'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { clockInAction, clockOutAction } from '@/actions/attendance'
import type { AttendanceLog } from '@/types'

type AttendanceSessionContextValue = {
  activeLog: AttendanceLog | null
  isClockPending: boolean
  elapsedLabel: string | null
  toggleClock: () => void
  reconcileLog: (log: AttendanceLog) => void
  removeLog: (logId: string) => void
}

const AttendanceSessionContext = createContext<AttendanceSessionContextValue | null>(null)

function getElapsedLabel(timeIn: string | null): string | null {
  if (!timeIn) return null
  const [hours, minutes] = timeIn.split(':').map(Number)
  const now = new Date()
  const startedAt = new Date(now)
  startedAt.setHours(hours, minutes, 0, 0)
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 60000))
  return `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m active`
}

export function AttendanceSessionProvider({
  initialActiveLog,
  children,
}: {
  initialActiveLog: AttendanceLog | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const [activeLog, setActiveLog] = useState(initialActiveLog)
  const [now, setNow] = useState(() => Date.now())
  const [isClockPending, startTransition] = useTransition()
  const lockRef = useRef(false)

  useEffect(() => {
    if (!activeLog) return
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [activeLog])

  const reconcileLog = useCallback((log: AttendanceLog) => {
    setActiveLog(log.time_out === null ? log : (current) => current?.id === log.id ? null : current)
  }, [])

  const removeLog = useCallback((logId: string) => {
    setActiveLog((current) => current?.id === logId ? null : current)
  }, [])

  const toggleClock = useCallback(() => {
    if (lockRef.current) return
    lockRef.current = true

    startTransition(async () => {
      try {
        if (activeLog) {
          const result = await clockOutAction(activeLog.id)
          if (!result.success || !result.data) {
            toast.error(result.error || 'Failed to clock out.')
            return
          }
          setActiveLog(null)
          toast.success('Successfully clocked out!')
        } else {
          const result = await clockInAction()
          if (!result.success || !result.data) {
            toast.error(result.error || 'Failed to clock in.')
            return
          }
          setActiveLog(result.data)
          toast.success('Successfully clocked in!')
        }
        router.refresh()
      } finally {
        lockRef.current = false
      }
    })
  }, [activeLog, router, startTransition])

  const elapsedLabel = activeLog ? getElapsedLabel(activeLog.time_in) : null
  // Recalculate the label after each minute tick without storing derived state.
  void now

  const value = useMemo(() => ({ activeLog, isClockPending, elapsedLabel, toggleClock, reconcileLog, removeLog }), [activeLog, elapsedLabel, isClockPending, reconcileLog, removeLog, toggleClock])

  return <AttendanceSessionContext.Provider value={value}>{children}</AttendanceSessionContext.Provider>
}

export function useAttendanceSession() {
  const context = useContext(AttendanceSessionContext)
  if (!context) throw new Error('useAttendanceSession must be used inside AttendanceSessionProvider')
  return context
}
