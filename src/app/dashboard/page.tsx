import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getMyProfile, getMyProgress } from '@/actions/students'
import { getMyAttendanceLogs } from '@/actions/attendance'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { AttendanceLogsClient } from '@/components/tables/AttendanceLogsClient'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { ShieldAlert } from 'lucide-react'

function AttendanceLogsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Skeleton for WelcomeCard */}
      <div className="h-44 rounded-3xl bg-stone-200 dark:bg-stone-850" />
      <div className="space-y-2 pt-4">
        <div className="h-6 w-48 rounded bg-stone-200 dark:bg-stone-850" />
        <div className="h-4 w-72 rounded bg-stone-200 dark:bg-stone-850" />
      </div>
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-900/60" />
        ))}
      </div>
    </div>
  )
}

async function AttendanceLogsSection({
  internId,
  firstName,
  program,
}: {
  internId: string
  firstName: string
  program: string
}) {
  const logs = await getMyAttendanceLogs()
  return (
    <AttendanceLogsClient
      initialLogs={logs}
      internId={internId}
      firstName={firstName}
      program={program}
    />
  )
}

export const metadata = { title: 'Dashboard — BatSU OJT Monitor' }

export default async function StudentDashboardPage() {
  const [profile, progress] = await Promise.all([
    getMyProfile(),
    getMyProgress(),
  ])

  if (!profile) redirect('/login')

  // Admins go to their own dashboard
  if (profile.role === 'admin') redirect('/dashboard/admin')

  return (
    <div className="space-y-8 py-4">
      {/* Projects & Portfolio */}
      <ProjectCard projects={progress?.projects || []} personalGithubLink={profile.github_link} />

      {/* Progress Card Section */}
      {progress ? (
        <ProgressCard progress={progress} />
      ) : (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span>Progress data is currently unavailable. Please contact the administrator.</span>
        </div>
      )}

      {/* Attendance Logs + Welcome Card (combined client boundary for real-time clock sync) */}
      <Suspense fallback={<AttendanceLogsSkeleton />}>
        <AttendanceLogsSection
          internId={profile.id}
          firstName={profile.first_name}
          program={profile.program}
        />
      </Suspense>
    </div>
  )
}
