'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { Student, AttendanceLog, StudentProgress } from '@/types'
import { clockInAction, clockOutAction } from '@/actions/attendance'
import { WelcomeCard } from '@/components/ui/WelcomeCard'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { AttendanceLogsClient } from '@/components/tables/AttendanceLogsClient'
import { ShieldAlert } from 'lucide-react'

interface DashboardClientProps {
  profile: Student
  progress: StudentProgress | null
  initialLogs: AttendanceLog[]
}

export function DashboardClient({ profile, progress, initialLogs }: DashboardClientProps) {
  const [logs, setLogs] = useState<AttendanceLog[]>(initialLogs)
  const [isSyncing, startSyncTransition] = useTransition()
  
  const activeLog = logs.find((l) => l.time_out === null) ?? null

  function handleClockAction() {
    startSyncTransition(async () => {
      if (activeLog) {
        const res = await clockOutAction(activeLog.id)
        if (res.success && res.data) {
          setLogs((prev) => prev.map((l) => (l.id === res.data!.id ? res.data! : l)))
          toast.success('Successfully clocked out!')
        } else {
          toast.error(res.error || 'Failed to clock out.')
        }
      } else {
        const res = await clockInAction()
        if (res.success && res.data) {
          setLogs((prev) => [res.data!, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
          toast.success('Successfully clocked in!')
        } else {
          toast.error(res.error || 'Failed to clock in.')
        }
      }
    })
  }

  return (
    <div className="space-y-8 py-4">
      {/* 1. Welcome Greeting Card (At the top) */}
      <WelcomeCard
        firstName={profile.first_name}
        program={profile.program}
        activeLog={activeLog}
        isSyncing={isSyncing}
        onClockAction={handleClockAction}
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
        logs={logs}
        setLogs={setLogs}
        activeLog={activeLog}
        isSyncing={isSyncing}
        onClockAction={handleClockAction}
        internId={profile.id}
      />
    </div>
  )
}
