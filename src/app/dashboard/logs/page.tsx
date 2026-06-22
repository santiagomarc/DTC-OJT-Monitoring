import { getMyAttendanceLogs } from '@/actions/attendance'
import { AttendanceLogsClient } from '@/components/tables/AttendanceLogsClient'

export const metadata = { title: 'My Attendance Logs — BatSU OJT Monitor' }

export default async function LogsPage() {
  const logs = await getMyAttendanceLogs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendance Logs</h1>
        <p className="mt-1 text-sm text-gray-400">
          Log your daily time-in, time-out, and task accomplishments.
        </p>
      </div>
      <AttendanceLogsClient initialLogs={logs} />
    </div>
  )
}
