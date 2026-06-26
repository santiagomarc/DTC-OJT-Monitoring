'use client'

import { useState } from 'react'
import type { AttendanceLog } from '@/types'
import { Calendar, Clock, Eye, X } from 'lucide-react'

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
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null)

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 dark:border-white/5 p-8 text-center bg-stone-50/80 dark:bg-stone-900/10">
        <p className="text-stone-500 text-sm">No entries found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2.5">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 select-none">
            <th className="px-5 py-2 text-left">Date</th>
            <th className="px-5 py-2 text-left">Time Session</th>
            <th className="px-5 py-2 text-left">Hours</th>
            <th className="hidden md:table-cell px-5 py-2 text-left max-w-[200px]">Planned Task</th>
            <th className="hidden lg:table-cell px-5 py-2 text-left max-w-[250px]">Accomplished</th>
            <th className="px-5 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="group rounded-2xl bg-white dark:bg-stone-900/40 backdrop-blur-md transition-all duration-300 border border-transparent hover:border-stone-200/80 dark:hover:border-white/10"
            >
              <td className="px-5 py-4 first:rounded-l-2xl border-y border-l border-stone-200/60 dark:border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-500" />
                  <span className="font-bold text-stone-900 dark:text-white text-sm">{formatDate(log.date)}</span>
                </div>
              </td>
              <td className="px-5 py-4 border-y border-stone-200/60 dark:border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                  <span>{formatTime(log.time_in)}</span>
                  <span>→</span>
                  {log.time_out ? (
                    <span>{formatTime(log.time_out)}</span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-500 dark:text-amber-400 font-bold border border-amber-500/20">Active</span>
                  )}
                </div>
              </td>
              <td className="px-5 py-4 border-y border-stone-200/60 dark:border-white/5 whitespace-nowrap">
                {log.total_hours != null ? (
                  <span className="rounded-xl bg-red-500/15 border border-red-500/20 px-2.5 py-1 text-xs font-extrabold text-red-600 dark:text-red-400">
                    {Number(log.total_hours).toFixed(2)}h
                  </span>
                ) : (
                  <span className="text-stone-400">—</span>
                )}
              </td>
              <td className="hidden md:table-cell px-5 py-4 border-y border-stone-200/60 dark:border-white/5 max-w-[200px] text-xs text-stone-650 dark:text-stone-300 truncate">
                {log.planned_task ?? <span className="italic text-stone-400">No task planned</span>}
              </td>
              <td className="hidden lg:table-cell px-5 py-4 border-y border-stone-200/60 dark:border-white/5 max-w-[250px] text-xs text-stone-650 dark:text-stone-300 truncate">
                {log.actual_accomplishment ?? <span className="italic text-stone-400">No details provided</span>}
              </td>
              <td className="px-5 py-4 last:rounded-r-2xl border-y border-r border-stone-200/60 dark:border-white/5 text-right whitespace-nowrap">
                <button
                  onClick={() => setSelectedLog(log)}
                  className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white transition"
                  title="View Detailed Log"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detailed Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-stone-900 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-white uppercase tracking-wider">Attendance Log Details</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Detailed overview of attendance session</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 rounded-2xl bg-stone-50 p-4 dark:bg-stone-950/40">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Date</span>
                  <span className="text-sm font-bold text-stone-900 dark:text-white">{formatDate(selectedLog.date)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Time Session</span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-white">
                    {formatTime(selectedLog.time_in)} → {selectedLog.time_out ? formatTime(selectedLog.time_out) : 'Active'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Total Hours</span>
                  {selectedLog.total_hours != null ? (
                    <span className="rounded-xl bg-red-500/15 border border-red-500/20 px-2.5 py-1 text-xs font-extrabold text-red-600 dark:text-red-400">
                      {Number(selectedLog.total_hours).toFixed(2)}h
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Planned Task / Activities</h4>
                <div className="rounded-2xl border border-stone-200/60 bg-white/50 p-4 dark:border-white/5 dark:bg-stone-950/20">
                  <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                    {selectedLog.planned_task || <span className="italic text-stone-400">No task planned</span>}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Actual Accomplishment</h4>
                <div className="rounded-2xl border border-stone-200/60 bg-white/50 p-4 dark:border-white/5 dark:bg-stone-950/20">
                  <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                    {selectedLog.actual_accomplishment || <span className="italic text-stone-400">No details provided</span>}
                  </p>
                </div>
              </div>

              {selectedLog.photo_url && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Documentation Photo</h4>
                  <div className="relative overflow-hidden rounded-2xl border border-stone-200 dark:border-white/10 max-h-[300px] flex items-center justify-center bg-stone-50 dark:bg-stone-950/20">
                    <img
                      src={selectedLog.photo_url}
                      alt="Documentation"
                      className="max-h-[280px] w-auto object-contain py-2"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-stone-100 dark:border-white/5 mt-6">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl border border-stone-200 bg-white dark:border-white/10 dark:bg-stone-900 px-5 py-2 text-sm font-semibold text-stone-600 dark:text-stone-400 transition hover:bg-stone-50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
