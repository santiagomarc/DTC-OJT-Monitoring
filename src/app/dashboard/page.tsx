import { redirect } from 'next/navigation'
import { getMyProfile, getMyProgress } from '@/actions/students'
import { getMyAttendanceLogs } from '@/actions/attendance'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { RecentLogsTable } from '@/components/tables/RecentLogsTable'
import { EditProjectDialog } from '@/components/dialogs/EditProjectDialog'
import { EditGithubLinkDialog } from '@/components/dialogs/EditGithubLinkDialog'

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

  const recentLogs = logs.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {profile.first_name} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {profile.program} Intern · {profile.required_ojt_hours}h required
        </p>
      </div>

      {/* Internship Details Cards (Project & GitHub Link above 4 stat boxes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Assigned Project
            </span>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {profile.assigned_project || 'No project assigned yet'}
            </p>
          </div>
          <div>
            <EditProjectDialog initialValue={profile.assigned_project} />
          </div>
        </div>

        {/* GitHub Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 shadow-sm flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              GitHub Repository
            </span>
            {profile.github_link ? (
              <a
                href={profile.github_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-lg font-bold text-violet-600 dark:text-violet-400 hover:underline truncate"
              >
                {profile.github_link.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
              </a>
            ) : (
              <p className="text-lg font-bold text-gray-500 dark:text-gray-400">
                Not linked yet
              </p>
            )}
          </div>
          <div>
            <EditGithubLinkDialog initialValue={profile.github_link} />
          </div>
        </div>
      </div>

      {/* Progress cards */}
      {progress && <ProgressCard progress={progress} />}

      {/* Recent logs */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Entries</h2>
          <a
            href="/dashboard/logs"
            className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            View all →
          </a>
        </div>
        <RecentLogsTable logs={recentLogs} />
      </div>
    </div>
  )
}
