'use client'

import { useState, useActionState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { createAttendanceLog, updateAttendanceLog, deleteAttendanceLog } from '@/actions/attendance'
import type { AttendanceLog, ActionResult } from '@/types'

interface Props {
  initialLogs: AttendanceLog[]
}

const emptyState: ActionResult = { success: false }

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Inline attendance log form (create or edit) */
function AttendanceForm({
  logId,
  defaultValues,
  onCancel,
  onSuccess,
}: {
  logId?: string
  defaultValues?: Partial<AttendanceLog>
  onCancel: () => void
  onSuccess: (log: AttendanceLog) => void
}) {
  const isEdit = !!logId

  const boundAction = isEdit
    ? updateAttendanceLog.bind(null, logId!, emptyState)
    : createAttendanceLog.bind(null, emptyState)

  const [state, formAction, isPending] = useActionState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boundAction as any,
    emptyState
  )

  // If success, bubble up
  if (state.success && state.data) {
    onSuccess(state.data as AttendanceLog)
  }
  if (state.error) toast.error(state.error)

  return (
    <form
      action={formAction}
      className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-white">
        {isEdit ? 'Edit Entry' : 'New Attendance Entry'}
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Date</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={defaultValues?.date ?? new Date().toISOString().split('T')[0]}
            className="input"
          />
        </div>
        <div>
          <label className="label">Time In</label>
          <input
            name="time_in"
            type="time"
            required
            defaultValue={defaultValues?.time_in?.slice(0, 5) ?? '08:00'}
            className="input"
          />
        </div>
        <div>
          <label className="label">Time Out</label>
          <input
            name="time_out"
            type="time"
            defaultValue={defaultValues?.time_out?.slice(0, 5) ?? ''}
            className="input"
          />
          <p className="mt-1 text-xs text-gray-500">Leave blank if still in progress</p>
        </div>
      </div>

      <div>
        <label className="label">Planned Task / Activities</label>
        <textarea
          name="planned_task"
          rows={2}
          defaultValue={defaultValues?.planned_task ?? ''}
          className="input resize-none"
          placeholder="What do you plan to work on today?"
        />
      </div>

      <div>
        <label className="label">Actual Accomplishment</label>
        <textarea
          name="actual_accomplishment"
          rows={2}
          defaultValue={defaultValues?.actual_accomplishment ?? ''}
          className="input resize-none"
          placeholder="What did you actually accomplish?"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </form>
  )
}

export function AttendanceLogsClient({ initialLogs }: Props) {
  const [logs, setLogs] = useState<AttendanceLog[]>(initialLogs)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreated(log: AttendanceLog) {
    setLogs((prev) => [log, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    setShowForm(false)
    toast.success('Attendance entry saved!')
  }

  function handleUpdated(log: AttendanceLog) {
    setLogs((prev) => prev.map((l) => (l.id === log.id ? log : l)))
    setEditId(null)
    toast.success('Entry updated!')
  }

  function handleDelete(logId: string) {
    startTransition(async () => {
      const result = await deleteAttendanceLog(logId)
      if (result.success) {
        setLogs((prev) => prev.filter((l) => l.id !== logId))
        toast.success('Entry deleted.')
      } else {
        toast.error(result.error ?? 'Failed to delete')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          Log Attendance
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <AttendanceForm
          onCancel={() => setShowForm(false)}
          onSuccess={handleCreated}
        />
      )}

      {/* Logs list */}
      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
          <p className="text-gray-500">No attendance entries yet.</p>
          <p className="mt-1 text-sm text-gray-600">Click &quot;Log Attendance&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) =>
            editId === log.id ? (
              <AttendanceForm
                key={log.id}
                logId={log.id}
                defaultValues={log}
                onCancel={() => setEditId(null)}
                onSuccess={handleUpdated}
              />
            ) : (
              <LogCard
                key={log.id}
                log={log}
                onEdit={() => setEditId(log.id)}
                onDelete={() => handleDelete(log.id)}
                isDeleting={isPending}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

function LogCard({
  log,
  onEdit,
  onDelete,
  isDeleting,
}: {
  log: AttendanceLog
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-sm font-semibold text-white">{formatDate(log.date)}</span>
            <span className="text-xs text-gray-500">
              {formatTime(log.time_in)} → {formatTime(log.time_out)}
            </span>
            {log.total_hours != null && (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
                {Number(log.total_hours).toFixed(2)}h
              </span>
            )}
            {log.time_out == null && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                In Progress
              </span>
            )}
          </div>

          {log.planned_task && (
            <div className="mb-2">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Planned</p>
              <p className="mt-0.5 text-sm text-gray-300 line-clamp-2">{log.planned_task}</p>
            </div>
          )}
          {log.actual_accomplishment && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Accomplished</p>
              <p className="mt-0.5 text-sm text-gray-300 line-clamp-2">{log.actual_accomplishment}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-white/10 hover:text-white"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
