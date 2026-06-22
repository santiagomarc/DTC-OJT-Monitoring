import type { AttendanceLog } from '@/types'

interface Props {
  logs: AttendanceLog[]
  readOnly?: boolean
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function RecentLogsTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
        <p className="text-gray-500 text-sm">No entries found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time In</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time Out</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Hours</th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Planned Task</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Accomplished</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {logs.map((log) => (
            <tr key={log.id} className="transition hover:bg-white/5">
              <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{formatDate(log.date)}</td>
              <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{formatTime(log.time_in)}</td>
              <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                {log.time_out ? formatTime(log.time_out) : (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">In Progress</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {log.total_hours != null ? (
                  <span className="font-medium text-violet-300">{Number(log.total_hours).toFixed(2)}h</span>
                ) : '—'}
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-gray-400 max-w-[200px] truncate">
                {log.planned_task ?? '—'}
              </td>
              <td className="hidden lg:table-cell px-4 py-3 text-gray-400 max-w-[200px] truncate">
                {log.actual_accomplishment ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
