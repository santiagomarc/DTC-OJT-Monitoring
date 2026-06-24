import type { AttendanceLog } from '@/types'
import { Calendar, Clock } from 'lucide-react'

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
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/5 p-8 text-center bg-white/40 dark:bg-gray-900/10">
        <p className="text-gray-500 text-sm">No entries found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2.5">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none">
            <th className="px-5 py-2 text-left">Date</th>
            <th className="px-5 py-2 text-left">Time Session</th>
            <th className="px-5 py-2 text-left">Hours</th>
            <th className="hidden md:table-cell px-5 py-2 text-left max-w-[200px]">Planned Task</th>
            <th className="hidden lg:table-cell px-5 py-2 text-left max-w-[250px]">Accomplished</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="group rounded-2xl bg-white dark:bg-gray-900/40 backdrop-blur-md transition-all duration-300 border border-transparent hover:border-gray-200/80 dark:hover:border-white/10"
            >
              <td className="px-5 py-4 first:rounded-l-2xl border-y border-l border-gray-200/60 dark:border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-500" />
                  <span className="font-bold text-gray-900 dark:text-white text-sm">{formatDate(log.date)}</span>
                </div>
              </td>
              <td className="px-5 py-4 border-y border-gray-200/60 dark:border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span>{formatTime(log.time_in)}</span>
                  <span>→</span>
                  {log.time_out ? (
                    <span>{formatTime(log.time_out)}</span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-500 dark:text-amber-400 font-bold border border-amber-500/20">Active</span>
                  )}
                </div>
              </td>
              <td className="px-5 py-4 border-y border-gray-200/60 dark:border-white/5 whitespace-nowrap">
                {log.total_hours != null ? (
                  <span className="rounded-xl bg-violet-500/15 border border-violet-500/20 px-2.5 py-1 text-xs font-extrabold text-violet-600 dark:text-violet-400">
                    {Number(log.total_hours).toFixed(2)}h
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="hidden md:table-cell px-5 py-4 border-y border-gray-200/60 dark:border-white/5 max-w-[200px] text-xs text-gray-650 dark:text-gray-300 truncate">
                {log.planned_task ?? <span className="italic text-gray-400">No task planned</span>}
              </td>
              <td className="hidden lg:table-cell px-5 py-4 last:rounded-r-2xl border-y border-r border-gray-200/60 dark:border-white/5 max-w-[250px] text-xs text-gray-650 dark:text-gray-300 truncate">
                {log.actual_accomplishment ?? <span className="italic text-gray-400">No details provided</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
