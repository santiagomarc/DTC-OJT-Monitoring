import { redirect } from 'next/navigation'
import { getMyProfile, getMyProgress } from '@/actions/students'
import { getMyAttendanceLogs } from '@/actions/attendance'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export const metadata = { title: 'Dashboard — BatSU OJT Monitor' }

export default async function StudentDashboardPage() {
  // Fetch all initial data in parallel
  const [profile, progress, logs] = await Promise.all([
    getMyProfile(),
    getMyProgress(),
    getMyAttendanceLogs(),
  ])

  if (!profile) redirect('/login')

  // Admins go to their own dashboard
  if (profile.role === 'admin') redirect('/dashboard/admin')

  return (
    <DashboardClient
      key={logs.map((log) => `${log.id}:${log.updated_at}`).join('|')}
      profile={profile}
      progress={progress}
      initialLogs={logs}
    />
  )
}
