import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getMyProfile, getMyProgress } from '@/actions/students'
import { getMyAttendanceLogs } from '@/actions/attendance'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { AttendanceLogsClient } from '@/components/tables/AttendanceLogsClient'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { EditGithubLinkDialog } from '@/components/dialogs/EditGithubLinkDialog'
import { ShieldAlert } from 'lucide-react'

// Custom GitHub icon to avoid lucide-react brand icon deprecation issues
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

function AttendanceLogsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-stone-200 dark:bg-stone-850" />
        <div className="h-4 w-72 rounded bg-stone-200 dark:bg-stone-850" />
      </div>
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-900/60" />
        ))}
      </div>
    </div>
  )
}

async function AttendanceLogsSection({ internId }: { internId: string }) {
  const logs = await getMyAttendanceLogs()
  return <AttendanceLogsClient initialLogs={logs} internId={internId} />
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
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 to-orange-700 p-8 text-white shadow-xl shadow-orange-500/10">
        <div className="relative z-10 space-y-2">

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Welcome back, {profile.first_name} 👋
          </h1>
          <p className="max-w-2xl text-sm font-medium text-red-100 sm:text-base">
            Track your hours, submit daily logs, and monitor your overall progress in the {profile.program} OJT Program.
          </p>
        </div>
        {/* Abstract background blur */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-orange-500/30 blur-3xl" />
      </div>

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

      {/* Attendance Logs Client Section */}
      <Suspense fallback={<AttendanceLogsSkeleton />}>
        <AttendanceLogsSection internId={profile.id} />
      </Suspense>
    </div>
  )
}
