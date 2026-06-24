import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/actions/students'
import { Sidebar } from '@/components/ui/Sidebar'
import { AdminHeader } from '@/components/ui/AdminHeader'
import { SyncRefreshBanner } from '@/components/ui/SyncRefreshBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role === 'admin') {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <AdminHeader profile={profile} />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
        <SyncRefreshBanner />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </main>
      <SyncRefreshBanner />
    </div>
  )
}
