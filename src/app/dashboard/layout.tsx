import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/cache'
import { getMyProfile } from '@/actions/students'
import { StudentHeader } from '@/components/ui/StudentHeader'
import { AdminHeader } from '@/components/ui/AdminHeader'
import { AttendanceSessionProvider } from '@/components/attendance/AttendanceSessionProvider'
import { getMyActiveAttendanceLog } from '@/actions/attendance'


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCachedUser()

  if (!user) redirect('/login')

  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role === 'admin') {
    return (
      <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
        <AdminHeader profile={profile} />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

      </div>
    )
  }

  const activeLog = await getMyActiveAttendanceLog()

  return (
    <AttendanceSessionProvider initialActiveLog={activeLog}>
      <div className="flex min-h-screen flex-col bg-stone-50 dark:bg-stone-950">
        <StudentHeader profile={profile} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </AttendanceSessionProvider>
  )
}
