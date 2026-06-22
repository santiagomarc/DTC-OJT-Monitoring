import { redirect } from 'next/navigation'
import { getMyProfile, getMyProgress } from '@/actions/students'
import { getMyAttendanceLogs } from '@/actions/attendance'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { RecentLogsTable } from '@/components/tables/RecentLogsTable'

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
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {profile.first_name} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {profile.program} Intern · {profile.required_ojt_hours}h required
        </p>
      </div>

      {/* Progress cards */}
      {progress && <ProgressCard progress={progress} />}

      {/* Recent logs */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Entries</h2>
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
