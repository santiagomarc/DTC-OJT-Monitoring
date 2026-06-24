import { redirect } from 'next/navigation'
import { getMyProfile, getMyProgress } from '@/actions/students'
import { getMyAttendanceLogs } from '@/actions/attendance'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { AttendanceLogsClient } from '@/components/tables/AttendanceLogsClient'
import { EditProjectDialog } from '@/components/dialogs/EditProjectDialog'
import { EditGithubLinkDialog } from '@/components/dialogs/EditGithubLinkDialog'
import { Briefcase, ShieldAlert } from 'lucide-react'

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

export const metadata = { title: 'Dashboard — BatSU OJT Monitor' }

export default async function StudentDashboardPage() {
  const [profile, progress, logs] = await Promise.all([
    getMyProfile(),
    getMyProgress(),
    getMyAttendanceLogs(),
  ])

  if (!profile) redirect('/login')

  // Admins go to their own dashboard
  if (profile.role === 'admin') redirect('/dashboard/admin')

  return (
    <div className="space-y-8 py-4">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-700 p-8 text-white shadow-xl shadow-indigo-500/10">
        <div className="relative z-10 space-y-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            Intern Space
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Welcome back, {profile.first_name} 👋
          </h1>
          <p className="max-w-2xl text-sm font-medium text-violet-100 sm:text-base">
            Track your hours, submit daily logs, and monitor your overall progress in the {profile.program} OJT Program.
          </p>
        </div>
        {/* Abstract background blur */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" />
      </div>

      {/* Internship Details Cards (Project & GitHub Link above stat boxes) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Project Card */}
        <div className="group relative rounded-2xl border border-gray-200/80 bg-white/70 p-6 dark:border-white/10 dark:bg-gray-900/40 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                <Briefcase className="h-3.5 w-3.5 text-violet-500" />
                <span>Assigned Project</span>
              </div>
              <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                {profile.assigned_project || 'No project assigned yet'}
              </p>
              <p className="text-xs text-gray-550 dark:text-gray-400">
                {profile.assigned_project ? 'Keep your project title updated.' : 'Request your project supervisor to assign one.'}
              </p>
            </div>
            <div className="shrink-0 rounded-xl bg-violet-500/10 p-1 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
              <EditProjectDialog initialValue={profile.assigned_project} />
            </div>
          </div>
        </div>

        {/* GitHub Card */}
        <div className="group relative rounded-2xl border border-gray-200/80 bg-white/70 p-6 dark:border-white/10 dark:bg-gray-900/40 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                <GithubIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span>GitHub Repository</span>
              </div>
              {profile.github_link ? (
                <a
                  href={profile.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-lg font-black text-violet-600 dark:text-violet-400 hover:underline truncate"
                >
                  {profile.github_link.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                </a>
              ) : (
                <p className="text-lg font-bold text-gray-400 dark:text-gray-500 italic">
                  Not linked yet
                </p>
              )}
              <p className="text-xs text-gray-550 dark:text-gray-400">
                {profile.github_link ? 'Click above to open the repository.' : 'Link your GitHub repo to sync codebase contributions.'}
              </p>
            </div>
            <div className="shrink-0 rounded-xl bg-indigo-500/10 p-1 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <EditGithubLinkDialog initialValue={profile.github_link} />
            </div>
          </div>
        </div>
      </div>

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
      <AttendanceLogsClient initialLogs={logs} />
    </div>
  )
}
