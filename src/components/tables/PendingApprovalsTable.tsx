'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, CheckCheck, UserPlus } from 'lucide-react'
import { approveInternAction, bulkApproveInternsAction } from '@/actions/admin'
import type { Student } from '@/types'

interface Props {
  initialPending: Student[]
}

export function PendingApprovalsTable({ initialPending }: Props) {
  const [pending, setPending] = useState(initialPending)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const lockRef = useRef(false)

  const allSelected = pending.length > 0 && selectedIds.size === pending.length
  const someSelected = selectedIds.size > 0

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pending.map((s) => s.id)))
    }
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        All caught up — there are no registrations awaiting review.
      </div>
    )
  }

  function handleApprove(internId: string) {
    if (lockRef.current) return
    lockRef.current = true
    setLoadingId(internId)
    startTransition(async () => {
      try {
        const res = await approveInternAction(internId)
        if (res.success) {
          setPending((prev) => prev.filter((s) => s.id !== internId))
          setSelectedIds((prev) => {
            const next = new Set(prev)
            next.delete(internId)
            return next
          })
          toast.success('Intern approved successfully!')
        } else {
          toast.error(res.error || 'Failed to approve.')
        }
      } finally {
        setLoadingId(null)
        lockRef.current = false
      }
    })
  }

  function handleBulkApprove() {
    if (lockRef.current || selectedIds.size === 0) return
    lockRef.current = true
    setIsBulkLoading(true)
    startTransition(async () => {
      try {
        const ids = Array.from(selectedIds)
        const res = await bulkApproveInternsAction(ids)
        if (res.success) {
          setPending((prev) => prev.filter((s) => !selectedIds.has(s.id)))
          toast.success(`${ids.length} intern${ids.length > 1 ? 's' : ''} approved!`)
          setSelectedIds(new Set())
        } else {
          toast.error(res.error || 'Bulk approval failed.')
        }
      } finally {
        setIsBulkLoading(false)
        lockRef.current = false
      }
    })
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 dark:border-amber-500/20 dark:bg-amber-950/20 backdrop-blur-sm shadow-sm transition-all duration-300">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
            <UserPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-base font-black text-stone-900 dark:text-white uppercase tracking-wider">
            Pending Registrations
          </h2>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
            {pending.length}
          </span>
        </div>

        {/* Bulk Approve Button */}
        {someSelected && (
          <button
            onClick={handleBulkApprove}
            disabled={isPending || isBulkLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>
              {isBulkLoading
                ? 'Approving…'
                : `Approve Selected (${selectedIds.size})`}
            </span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-white/10 bg-white/50 dark:bg-stone-950/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/50 dark:border-white/10 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 select-none">
              <th className="px-4 py-3 text-center w-10">
                <label className="sr-only">Select all</label>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-stone-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 dark:border-white/20"
                />
              </th>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">SR-Code</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Program</th>
              <th className="px-5 py-3 text-left">Term/Year</th>
              <th className="px-5 py-3 text-left">Required Hours</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-white/5 font-medium text-stone-600 dark:text-stone-300">
            {pending.map((s) => (
              <tr
                key={s.id}
                className={`transition hover:bg-stone-50 dark:hover:bg-white/5 ${
                  selectedIds.has(s.id)
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                    : ''
                }`}
              >
                <td className="px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="h-4 w-4 cursor-pointer rounded border-stone-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 dark:border-white/20"
                  />
                </td>
                <td className="px-5 py-3.5 font-bold text-stone-900 dark:text-white whitespace-nowrap">
                  {s.last_name}, {s.first_name}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">{s.sr_code || '—'}</td>
                <td className="px-5 py-3.5 text-xs whitespace-nowrap">{s.email || '—'}</td>
                <td className="px-5 py-3.5 whitespace-nowrap">{s.program}</td>
                <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                  {s.academic_term ? `${s.academic_term} (${s.academic_year || ''})` : '—'}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">{s.required_ojt_hours}h</td>
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleApprove(s.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{loadingId === s.id ? 'Approving…' : 'Approve'}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
