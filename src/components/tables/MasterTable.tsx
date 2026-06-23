'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ExternalLink, Download } from 'lucide-react'
import type { StudentProgress } from '@/types'

interface Props {
  students: StudentProgress[]
  sheetUrl?: string
}

type SortKey = 'name' | 'program' | 'progress' | 'remaining'
type SortDir = 'asc' | 'desc'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MasterTable({ students, sheetUrl }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = students.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.last_name.toLowerCase().includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.program.toLowerCase().includes(q) ||
      (s.sr_code && s.sr_code.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') {
      cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    } else if (sortKey === 'program') {
      cmp = a.program.localeCompare(b.program)
    } else if (sortKey === 'progress') {
      const aPct = Number(a.total_rendered_hours) / a.required_ojt_hours
      const bPct = Number(b.total_rendered_hours) / b.required_ojt_hours
      cmp = aPct - bPct
    } else if (sortKey === 'remaining') {
      cmp = Number(a.remaining_hours) - Number(b.remaining_hours)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  function exportToCSV() {
    const headers = [
      'LAST NAME',
      'FIRST NAME',
      'SR-CODE',
      'EMAIL',
      'PROGRAM',
      'REQUIRED OJT HOURS',
      'RENDERED HOURS',
      'REMAINING HOURS',
      'ESTIMATED COMPLETION',
      'ASSIGNED PROJECT',
      'GITHUB LINK',
    ].join(',')

    const rows = sorted.map((s) => {
      return [
        `"${(s.last_name || '').replace(/"/g, '""')}"`,
        `"${(s.first_name || '').replace(/"/g, '""')}"`,
        `"${(s.sr_code || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.program || '').replace(/"/g, '""')}"`,
        s.required_ojt_hours,
        Number(s.total_rendered_hours).toFixed(1),
        Number(s.remaining_hours).toFixed(1),
        s.estimated_completion_date ? `"${s.estimated_completion_date}"` : 'TBD',
        `"${(s.assigned_project || '').replace(/"/g, '""')}"`,
        `"${(s.github_link || '').replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `DTC_OJT_Students_Report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search by name or program…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />

        <div className="flex flex-wrap items-center gap-3">
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google Sheet
            </a>
          )}
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">SR-Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
              <SortHeader label="Program" sortKey="program" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Required</th>
              <SortHeader label="Progress" sortKey="progress" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Remaining" sortKey="remaining" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Est. Completion</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">GitHub</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                  No interns found.
                </td>
              </tr>
            ) : sorted.map((s) => {
              const pct = Math.min(
                100,
                Math.round(
                  (Number(s.total_rendered_hours) / s.required_ojt_hours) * 100
                )
              )
              const isComplete = s.remaining_hours <= 0

              return (
                <tr key={s.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-white">
                      {s.last_name}, {s.first_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{s.sr_code || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{s.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{s.program}</td>
                  <td className="px-4 py-3 text-gray-400">{s.required_ojt_hours}h</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={`h-full rounded-full ${
                            isComplete ? 'bg-emerald-500' : 'bg-violet-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isComplete ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        Complete ✓
                      </span>
                    ) : (
                      <span className="text-gray-300">{Number(s.remaining_hours).toFixed(1)}h</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {formatDate(s.estimated_completion_date)}
                  </td>
                  <td className="px-4 py-3">
                    {s.github_link ? (
                      <a
                        href={s.github_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/${s.id}`}
                      className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap"
                    >
                      View logs →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
}) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-white transition-colors"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${current === sortKey ? 'text-violet-400' : ''}`} />
        {current === sortKey && (
          <span className="text-violet-400">{dir === 'asc' ? '↑' : '↓'}</span>
        )}
      </button>
    </th>
  )
}
