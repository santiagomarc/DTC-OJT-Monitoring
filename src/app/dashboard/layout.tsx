import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/cache'
import { getMyProfile } from '@/actions/students'
import { StudentHeader } from '@/components/ui/StudentHeader'
import { AdminHeader } from '@/components/ui/AdminHeader'
import { createClient } from '@/lib/supabase/server'


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCachedUser()

  if (!user) redirect('/login')

  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  let activeSessionId: string | null = null
  if (profile.role === 'student') {
    const supabase = await createClient()
    const { data } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('student_id', profile.id)
      .is('time_out', null)
      .limit(1)
      .maybeSingle()
    activeSessionId = data?.id ?? null
  }

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

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 dark:bg-stone-950">
      <StudentHeader profile={profile} activeSessionId={activeSessionId} />
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </main>

    </div>
  )
}
