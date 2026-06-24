import { redirect } from 'next/navigation'
import { getMyProfile, getMyProgress } from '@/actions/students'
import { getMyAttendanceLogs } from '@/actions/attendance'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { RecentLogsTable } from '@/components/tables/RecentLogsTable'
import { EditProfileDialog } from '@/components/dialogs/EditProfileDialog'

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {profile.first_name} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {profile.program} Intern · {profile.required_ojt_hours}h required
          </p>
        </div>
        <div>
          <EditProfileDialog
            initialData={{
              assigned_project: profile.assigned_project,
              github_link: profile.github_link,
            }}
          />
        </div>
      </div>

      {/* Progress cards */}
      {progress && <ProgressCard progress={progress} />}

      {/* Internship Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Internship Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/5">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Assigned Project
            </span>
            <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              {profile.assigned_project || 'No project assigned yet'}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/5">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              GitHub Repository
            </span>
            {profile.github_link ? (
              <p className="mt-1 text-base font-semibold text-violet-600 dark:text-violet-400 hover:underline break-all">
                <a href={profile.github_link} target="_blank" rel="noopener noreferrer">
                  {profile.github_link}
                </a>
              </p>
            ) : (
              <p className="mt-1 text-base font-semibold text-gray-500 dark:text-gray-400">
                Not linked yet
              </p>
            )}
          </div>
        </div>
      </div>

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
