'use client'

import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DTRControlsProps {
  selectedMonth: string
  availableMonths: string[]
}

export function DTRControls({ selectedMonth, availableMonths }: DTRControlsProps) {
  const router = useRouter()

  function handleMonthChange(val: string) {
    const params = new URLSearchParams(window.location.search)
    params.set('month', val)
    router.push(`/dashboard/dtr?${params.toString()}`)
  }

  return (
    <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-stone-900 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        
        <div className="flex flex-wrap items-center gap-3">
          {availableMonths.length > 0 && (
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-stone-950 dark:text-white"
            >
              {availableMonths.map((m) => {
                const [y, mn] = m.split('-')
                const display = new Date(parseInt(y), parseInt(mn) - 1).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })
                return (
                  <option key={m} value={m}>
                    {display}
                  </option>
                )
              })}
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-1.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-500 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print DTR
          </button>
        </div>
      </div>
    </div>
  )
}
