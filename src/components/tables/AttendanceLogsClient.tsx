'use client'

import { useState, useActionState, useTransition, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check, Clock, Calendar, BookOpen, ClipboardCheck, Eye } from 'lucide-react'
import { createAttendanceLog, updateAttendanceLog, deleteAttendanceLog } from '@/actions/attendance'
import type { AttendanceLog, ActionResult } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialLogs: AttendanceLog[]
  internId: string
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
}/** Inline attendance log form (create or edit) */
function AttendanceForm({
  internId,
  logId,
  defaultValues,
  onCancel,
  onSuccess,
}: {
  internId: string
  logId?: string
  defaultValues?: Partial<AttendanceLog>
  onCancel: () => void
  onSuccess: (log: AttendanceLog) => void
}) {
  const isEdit = !!logId
  const [isUploading, setIsUploading] = useState(false)

  const boundAction = isEdit
    ? updateAttendanceLog.bind(null, logId!)
    : createAttendanceLog

  const [state, formAction, isPending] = useActionState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boundAction as any,
    emptyState
  )

  const lastProcessedRef = useRef<ActionResult>(emptyState)

  useEffect(() => {
    if (state === lastProcessedRef.current) return
    if (state.success && state.data) {
      lastProcessedRef.current = state
      onSuccess(state.data as AttendanceLog)
    }
  }, [state, onSuccess])

  useEffect(() => {
    if (state === lastProcessedRef.current) return
    if (state.error) {
      lastProcessedRef.current = state
      toast.error(state.error)
    }
  }, [state])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsUploading(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    const photoFile = formData.get('photo') as File | null

    try {
      let photoUrl = defaultValues?.photo_url || null

      if (photoFile && photoFile.size > 0) {
        if (photoFile.size > 5 * 1024 * 1024) {
          toast.error('Photo size cannot exceed 5MB.')
          setIsUploading(false)
          return
        }
        if (!photoFile.type.startsWith('image/')) {
          toast.error('Only image files are allowed.')
          setIsUploading(false)
          return
        }

        const supabase = createClient()
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${internId}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('attendance_photos')
          .upload(fileName, photoFile, {
            contentType: photoFile.type,
            upsert: true,
          })

        if (uploadError) {
          toast.error(`Failed to upload photo: ${uploadError.message}`)
          setIsUploading(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('attendance_photos')
          .getPublicUrl(fileName)

        photoUrl = publicUrl
      }

      // Prepare final FormData for Server Action without the heavy File object
      const finalFormData = new FormData()
      for (const [key, value] of formData.entries()) {
        if (key !== 'photo') {
          finalFormData.append(key, value)
        }
      }

      if (photoUrl) {
        finalFormData.append('photo_url', photoUrl)
      }

      (formAction as any)(finalFormData)
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during submission.')
    } finally {
      setIsUploading(false)
    }
  }

  const isSaving = isUploading || isPending

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-red-200/80 bg-red-50/40 p-6 dark:border-red-500/20 dark:bg-red-950/20 backdrop-blur-md shadow-sm space-y-4 transition-all duration-300"
    >
      <div className="flex items-center justify-between border-b border-red-100 dark:border-red-500/10 pb-3">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          {isEdit ? 'Edit Attendance Entry' : 'Log New Attendance'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-white/5 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1.5">Date</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={defaultValues?.date ?? new Date().toISOString().split('T')[0]}
            className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-white/10 dark:bg-stone-950/40 dark:text-white"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1.5">Time In</label>
          <input
            name="time_in"
            type="time"
            required
            defaultValue={defaultValues?.time_in?.slice(0, 5) ?? '08:00'}
            className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-white/10 dark:bg-stone-950/40 dark:text-white"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1.5">Time Out</label>
          <input
            name="time_out"
            type="time"
            defaultValue={defaultValues?.time_out?.slice(0, 5) ?? ''}
            className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-white/10 dark:bg-stone-950/40 dark:text-white"
          />
          <p className="mt-1 text-[10px] text-stone-450">Leave blank if still in progress</p>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1.5">Planned Task / Activities</label>
        <textarea
          name="planned_task"
          rows={2}
          defaultValue={defaultValues?.planned_task ?? ''}
          className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-white/10 dark:bg-stone-950/40 dark:text-white resize-none"
          placeholder="What do you plan to work on?"
        />
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1.5">Actual Accomplishment</label>
        <textarea
          name="actual_accomplishment"
          rows={2}
          defaultValue={defaultValues?.actual_accomplishment ?? ''}
          className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-white/10 dark:bg-stone-950/40 dark:text-white resize-none"
          placeholder="What did you actually accomplish?"
        />
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1.5">Documentation / Photo</label>
        {defaultValues?.photo_url && (
          <div className="mb-3 flex items-center gap-3">
            <img
              src={defaultValues.photo_url}
              alt="Current documentation"
              className="h-16 w-16 rounded-xl object-cover border border-stone-200 dark:border-white/10"
            />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-stone-500 dark:text-stone-400">Current photo uploaded</span>
              <label className="flex items-center gap-1.5 text-xs text-red-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="remove_photo"
                  value="true"
                  className="rounded border-stone-300 text-red-700 focus:ring-red-500"
                />
                <span>Remove current photo</span>
              </label>
            </div>
          </div>
        )}
        <input
          name="photo"
          type="file"
          accept="image/*"
          className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-750 hover:file:bg-red-100 dark:file:bg-red-950/40 dark:file:text-red-400 dark:hover:file:bg-red-900/40"
        />
        <p className="mt-1 text-[10px] text-stone-450 dark:text-stone-500">Max size: 5MB (Optional)</p>
      </div>

      {state.error && (
        <p className="text-xs font-semibold text-red-500 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {isSaving ? 'Saving…' : 'Save Entry'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white dark:border-white/10 dark:bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-600 dark:text-stone-400 transition hover:bg-stone-50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </form>
  )
}

export function AttendanceLogsClient({ initialLogs, internId }: Props) {
  const [logs, setLogs] = useState<AttendanceLog[]>(initialLogs)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreated(log: AttendanceLog) {
    setLogs((prev) => [log, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    setShowForm(false)
    toast.success('Attendance entry logged successfully!')
  }

  function handleUpdated(log: AttendanceLog) {
    setLogs((prev) => prev.map((l) => (l.id === log.id ? log : l)))
    setEditId(null)
    toast.success('Attendance entry updated!')
  }

  function handleDelete(logId: string) {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this attendance log entry?')) {
      return
    }
    startTransition(async () => {
      const result = await deleteAttendanceLog(logId)
      if (result.success) {
        setLogs((prev) => prev.filter((l) => l.id !== logId))
        toast.success('Entry deleted successfully.')
      } else {
        toast.error(result.error ?? 'Failed to delete')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-250/20 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-black text-stone-900 dark:text-white uppercase tracking-wider">Attendance Logs</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Log and manage your daily hours and activity outputs</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Log Attendance
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <AttendanceForm
            internId={internId}
            onCancel={() => setShowForm(false)}
            onSuccess={handleCreated}
          />
        </div>
      )}

      {/* Logs list */}
      {logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 dark:border-white/5 p-12 text-center">
          <Clock className="h-8 w-8 text-stone-400 dark:text-stone-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-550 dark:text-stone-400">No attendance entries logged yet.</p>
          <p className="mt-1 text-xs text-stone-450 dark:text-stone-500">Get started by clicking &quot;Log Attendance&quot;.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 select-none">
                  <th className="px-5 py-2 text-left">Date</th>
                  <th className="px-5 py-2 text-left">Time Session</th>
                  <th className="px-5 py-2 text-left">Hours</th>
                  <th className="px-5 py-2 text-left max-w-[200px]">Planned Task</th>
                  <th className="px-5 py-2 text-left max-w-[250px]">Accomplished</th>
                  <th className="px-5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) =>
                  editId === log.id ? (
                    <tr key={log.id}>
                      <td colSpan={6} className="p-0">
                        <div className="py-2 animate-in fade-in duration-200">
                          <AttendanceForm
                            internId={internId}
                            logId={log.id}
                            defaultValues={log}
                            onCancel={() => setEditId(null)}
                            onSuccess={handleUpdated}
                          />
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={log.id}
                      className="group rounded-2xl bg-white dark:bg-stone-900/40 backdrop-blur-md transition-all duration-300 hover:translate-x-0.5 hover:shadow-md border border-transparent hover:border-stone-200/80 dark:hover:border-white/10"
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
                      <td className="px-5 py-4 border-y border-stone-200/60 dark:border-white/5 max-w-[200px]">
                        <div className="flex items-start gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2" title={log.planned_task ?? undefined}>
                            {log.planned_task ?? <span className="italic text-stone-400">No task planned</span>}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 border-y border-stone-200/60 dark:border-white/5 max-w-[250px]">
                        <div className="flex items-start gap-1.5">
                          <ClipboardCheck className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2" title={log.actual_accomplishment ?? undefined}>
                            {log.actual_accomplishment ?? <span className="italic text-stone-400">No details provided</span>}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 last:rounded-r-2xl border-y border-r border-stone-200/60 dark:border-white/5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white transition"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditId(log.id)}
                            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white transition"
                            title="Edit Log"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            disabled={isPending}
                            className="rounded-lg p-2 text-stone-400 hover:bg-red-500/10 hover:text-red-500 dark:text-stone-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition disabled:opacity-50"
                            title="Delete Log"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {logs.map((log) =>
              editId === log.id ? (
                <div key={log.id} className="animate-in fade-in duration-200">
                  <AttendanceForm
                    internId={internId}
                    logId={log.id}
                    defaultValues={log}
                    onCancel={() => setEditId(null)}
                    onSuccess={handleUpdated}
                  />
                </div>
              ) : (
                <div
                  key={log.id}
                  className="rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-white/10 dark:bg-stone-900/40 backdrop-blur-md shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4 mb-3 border-b border-stone-100 dark:border-white/5 pb-2.5">
                    <div>
                      <span className="font-bold text-stone-900 dark:text-white text-sm">{formatDate(log.date)}</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400 mt-0.5">
                        <span>{formatTime(log.time_in)}</span>
                        <span>→</span>
                        {log.time_out ? (
                          <span>{formatTime(log.time_out)}</span>
                        ) : (
                          <span className="text-amber-500 dark:text-amber-400">In Progress</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {log.total_hours != null && (
                        <span className="rounded-xl bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">
                          {Number(log.total_hours).toFixed(1)}h
                        </span>
                      )}
                      
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-white/5 transition"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditId(log.id)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-white/5 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={isPending}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-500/10 hover:text-red-500 dark:text-stone-550 transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {log.planned_task && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Planned</span>
                        <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">{log.planned_task}</p>
                      </div>
                    )}
                    {log.actual_accomplishment && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Accomplished</span>
                        <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">{log.actual_accomplishment}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

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
                    {formatTime(selectedLog.time_in)} → {selectedLog.time_out ? formatTime(selectedLog.time_out) : 'In Progress'}
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
