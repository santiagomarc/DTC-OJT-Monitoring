import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/actions/students'
import { Sidebar } from '@/components/ui/Sidebar'

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

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
