import { redirect } from 'next/navigation'
import { getMyProfile } from '@/actions/students'
import { getAllStudentProgress } from '@/actions/students'
import { MasterTable } from '@/components/tables/MasterTable'

export const metadata = { title: 'Admin Dashboard — BatSU OJT Monitor' }

export default async function AdminDashboardPage() {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const students = await getAllStudentProgress()

  const totalRendered = students.reduce(
    (sum, s) => sum + Number(s.total_rendered_hours),
    0
  )
  const avgProgress =
    students.length > 0
      ? students.reduce(
          (sum, s) =>
            sum + (Number(s.total_rendered_hours) / s.required_ojt_hours) * 100,
          0
        ) / students.length
      : 0

  const behindCount = students.filter(
    (s) =>
      s.remaining_hours > 0 &&
      s.estimated_completion_date &&
      new Date(s.estimated_completion_date) > new Date(Date.now() + 7 * 24 * 3600 * 1000)
  ).length

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const sheetUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : undefined

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Master Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Overview of all OJT interns at the Digital Transformation Center
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-stone-500 dark:text-stone-400">Total Interns</p>
          <p className="mt-1 text-3xl font-bold text-stone-900 dark:text-white">{students.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500 dark:text-stone-400">Avg. Progress</p>
          <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
            {avgProgress.toFixed(1)}%
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500 dark:text-stone-400">Needs Attention</p>
          <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{behindCount}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500">completion &gt;7 days out</p>
        </div>
      </div>

      <MasterTable students={students} sheetUrl={sheetUrl} />
    </div>
  )
}
