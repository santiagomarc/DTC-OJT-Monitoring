import { redirect } from 'next/navigation'
import { getMyProfile, getStudentProgressById } from '@/actions/students'
import { createClient } from '@/lib/supabase/server'
import type { AttendanceLog } from '@/types'
import { RecentLogsTable } from '@/components/tables/RecentLogsTable'
import { ProgressCard } from '@/components/ui/ProgressCard'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EditInternDialog } from '@/components/dialogs/EditInternDialog'
import { AdminProjectsSection } from '@/components/ui/AdminProjectsSection'
import { ManualLogDialog } from '@/components/dialogs/ManualLogDialog'
import { DeleteInternDialog } from '@/components/dialogs/DeleteInternDialog'
import { getStudentProjects } from '@/actions/projects'

interface Props {
  params: Promise<{ internId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { internId } = await params
  const progress = await getStudentProgressById(internId)
  return {
    title: progress
      ? `${progress.last_name}, ${progress.first_name} — BatSU OJT Monitor`
      : 'Student Detail',
  }
}

export default async function AdminStudentDetailPage({ params }: Props) {
  const { internId } = await params

  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const progress = await getStudentProgressById(internId)
  if (!progress) redirect('/dashboard/admin')

  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('student_id', internId)
    .order('date', { ascending: false })

  const projects = await getStudentProjects(internId)

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/admin"
          className="mb-4 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Master Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
              {progress.last_name}, {progress.first_name}
            </h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {progress.program} · {progress.required_ojt_hours}h required
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EditInternDialog
              internId={internId}
              initialData={{
                required_ojt_hours: progress.required_ojt_hours,
              }}
            />
            <DeleteInternDialog
              internId={internId}
              lastName={progress.last_name}
            />
          </div>
        </div>
      </div>

      <ProgressCard progress={progress} />

      <AdminProjectsSection internId={internId} projects={projects} />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
            Attendance Log ({(logs ?? []).length} entries)
          </h2>
          <ManualLogDialog internId={internId} />
        </div>
        <RecentLogsTable logs={(logs as AttendanceLog[]) ?? []} readOnly />
      </div>
    </div>
  )
}
