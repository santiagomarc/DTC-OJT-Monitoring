'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, UserPlus } from 'lucide-react'
import { approveInternAction } from '@/actions/admin'
import type { Student } from '@/types'

interface Props {
  initialPending: Student[]
}

export function PendingApprovalsTable({ initialPending }: Props) {
  const [pending, setPending] = useState(initialPending)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const lockRef = useRef(false)

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

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 dark:border-amber-500/20 dark:bg-amber-950/20 backdrop-blur-sm shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
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

      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-white/10 bg-white/50 dark:bg-stone-950/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/50 dark:border-white/10 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 select-none">
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
              <tr key={s.id} className="transition hover:bg-stone-50 dark:hover:bg-white/5">
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
