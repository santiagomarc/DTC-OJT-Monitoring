import { redirect } from 'next/navigation'
import { getMyProfile, getStudentProgressById } from '@/actions/students'
import { createClient } from '@/lib/supabase/server'
import type { AttendanceLog } from '@/types'
import { RecentLogsTable } from '@/components/tables/RecentLogsTable'
import { ProgressCard } from '@/components/ui/ProgressCard'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EditInternDialog } from '@/components/dialogs/EditInternDialog'
import { ManualLogDialog } from '@/components/dialogs/ManualLogDialog'

interface Props {
  params: Promise<{ studentId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { studentId } = await params
  const progress = await getStudentProgressById(studentId)
  return {
    title: progress
      ? `${progress.last_name}, ${progress.first_name} — BatSU OJT Monitor`
      : 'Student Detail',
  }
}

export default async function AdminStudentDetailPage({ params }: Props) {
  const { studentId } = await params

  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const progress = await getStudentProgressById(studentId)
  if (!progress) redirect('/dashboard/admin')

  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/admin"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Master Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {progress.last_name}, {progress.first_name}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {progress.program} · {progress.required_ojt_hours}h required
            </p>
          </div>
          <EditInternDialog
            studentId={studentId}
            initialData={{
              required_ojt_hours: progress.required_ojt_hours,
              assigned_project: progress.assigned_project,
              github_link: progress.github_link,
            }}
          />
        </div>
      </div>

      <ProgressCard progress={progress} />

      {progress.assigned_project && (
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Assigned Project
          </p>
          <p className="mt-2 text-gray-900 dark:text-white">{progress.assigned_project}</p>
          {progress.github_link && (
            <a
              href={progress.github_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-violet-600 hover:text-violet-500 transition-colors dark:text-violet-400 dark:hover:text-violet-300"
            >
              View on GitHub →
            </a>
          )}
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Attendance Log ({(logs ?? []).length} entries)
          </h2>
          <ManualLogDialog studentId={studentId} />
        </div>
        <RecentLogsTable logs={(logs as AttendanceLog[]) ?? []} readOnly />
      </div>
    </div>
  )
}
