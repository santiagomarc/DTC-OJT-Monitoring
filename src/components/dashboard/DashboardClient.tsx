'use client'

import { useState, useMemo } from 'react'
import type { Student, AttendanceLog, StudentProgress } from '@/types'
import { WelcomeCard } from '@/components/ui/WelcomeCard'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { AttendanceLogsClient } from '@/components/tables/AttendanceLogsClient'
import { ShieldAlert } from 'lucide-react'
import { useAttendanceSession } from '@/components/attendance/AttendanceSessionProvider'

interface DashboardClientProps {
  profile: Student
  progress: StudentProgress | null
  initialLogs: AttendanceLog[]
}

export function DashboardClient({ profile, progress, initialLogs }: DashboardClientProps) {
  const [logs, setLogs] = useState<AttendanceLog[]>(initialLogs)
  const { activeLog, isClockPending, reconcileLog, removeLog } = useAttendanceSession()
  const visibleLogs = activeLog && !logs.some((log) => log.id === activeLog.id) ? [activeLog, ...logs] : logs

  const hasLoggedToday = useMemo(() => {
    const now = new Date()
    const phDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now)
    return logs.some(log => log.date === phDate)
  }, [logs])

  return (
    <div className="space-y-8 py-4">
      {/* 1. Welcome Greeting Card (At the top) */}
      <WelcomeCard
        firstName={profile.first_name}
        program={profile.program}
        activeLog={activeLog}
        hasLoggedToday={hasLoggedToday}
      />

      {/* 2. Projects & Portfolio */}
      <ProjectCard projects={progress?.projects || []} personalGithubLink={profile.github_link} />

      {/* 3. Hours Rendered and Other Metrics */}
      {progress ? (
        <ProgressCard progress={progress} />
      ) : (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span>Progress data is currently unavailable. Please contact the administrator.</span>
        </div>
      )}

      {/* 4. Attendance Logs Section (At the bottom) */}
      <AttendanceLogsClient
        logs={visibleLogs}
        setLogs={setLogs}
        activeLog={activeLog}
        isClockPending={isClockPending}
        reconcileLog={reconcileLog}
        removeLog={removeLog}
        internId={profile.id}
      />
    </div>
  )
}
