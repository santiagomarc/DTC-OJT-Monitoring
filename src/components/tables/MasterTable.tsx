'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ExternalLink, Download } from 'lucide-react'
import type { StudentProgress, AcademicTerm } from '@/types'

interface Props {
  students: StudentProgress[]
  atRiskIds: string[]
  sheetUrl?: string
}

type SortKey = 'name' | 'program' | 'progress' | 'remaining'
type SortDir = 'asc' | 'desc'
type TermTab = 'All' | AcademicTerm
type StatusFilter = 'all' | 'attention'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MasterTable({ students, atRiskIds, sheetUrl }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TermTab>('All')
  const [activeYear, setActiveYear] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const deferredSearch = useDeferredValue(search)
  const atRiskIdSet = useMemo(() => new Set(atRiskIds), [atRiskIds])

  // Extract unique academic years dynamically from students list
  const uniqueYears = Array.from(
    new Set(students.map((s) => s.academic_year).filter(Boolean))
  ).sort().reverse() as string[]

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const yearScopedStudents = useMemo(
    () => students.filter((student) => activeYear === 'All' || student.academic_year === activeYear),
    [activeYear, students]
  )

  const termCounts = useMemo(() => new Map<TermTab, number>([
    ['All', yearScopedStudents.length],
    ['First Semester', yearScopedStudents.filter((student) => student.academic_term === 'First Semester').length],
    ['Second Semester', yearScopedStudents.filter((student) => student.academic_term === 'Second Semester').length],
    ['Midyear', yearScopedStudents.filter((student) => student.academic_term === 'Midyear').length],
  ]), [yearScopedStudents])

  const sorted = useMemo(() => {
    const filtered = yearScopedStudents.filter((s) => {
      const q = deferredSearch.toLowerCase()
    
    // Search filter
    const matchesSearch = 
      s.last_name.toLowerCase().includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.program.toLowerCase().includes(q) ||
      (s.sr_code && s.sr_code.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))

    // Term filter
    const matchesTerm = activeTab === 'All' || s.academic_term === activeTab

    // Year filter
      const matchesStatus = statusFilter === 'all' || atRiskIdSet.has(s.id)

      return matchesSearch && matchesTerm && matchesStatus
    })

    return [...filtered].sort((a, b) => {
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
  }, [activeTab, atRiskIdSet, deferredSearch, sortDir, sortKey, statusFilter, yearScopedStudents])

  function resetFilters() {
    setSearch('')
    setActiveTab('All')
    setActiveYear('All')
    setStatusFilter('all')
  }

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
      const projectNames = s.projects?.map(p => p.name).join(' | ') || s.assigned_project || ''
      const projectLinks = s.projects?.map(p => p.github_link).filter(Boolean).join(' | ') || s.project_github_link || ''

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
        `"${projectNames.replace(/"/g, '""')}"`,
        `"${projectLinks.replace(/"/g, '""')}"`,
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
    <div className="space-y-6">
      {/* Category Tabs & Year Selector */}
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 dark:border-white/10 sm:gap-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {(['All', 'First Semester', 'Second Semester', 'Midyear'] as TermTab[]).map((tab) => {
            const count = termCounts.get(tab) ?? 0
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                }}
                className={`min-w-0 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:px-4 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md shadow-red-500/15'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-850'
                }`}
              >
                {tab}
                <span className="ml-1.5 opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {uniqueYears.length > 0 && (
          <label className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Academic Year</span>
            <select
              value={activeYear}
              onChange={(e) => setActiveYear(e.target.value)}
              aria-label="Academic year"
              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-stone-950 dark:text-white sm:flex-none"
            >
              <option value="All">All Years</option>
              {uniqueYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          )}
          <button onClick={() => setStatusFilter((current) => current === 'attention' ? 'all' : 'attention')} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${statusFilter === 'attention' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'}`}>
            Needs attention ({atRiskIds.length})
          </button>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search by name or program…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full max-w-none sm:max-w-sm"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20 hover:text-emerald-300 sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google Sheet
            </a>
          )}
          <button
            onClick={exportToCSV}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-white/10" tabIndex={0} aria-label="Scrollable intern records table">
        <table className="min-w-[960px] w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 dark:border-white/10 dark:bg-white/5">
              <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">SR-Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Email</th>
              <SortHeader label="Program" sortKey="program" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Required</th>
              <SortHeader label="Progress" sortKey="progress" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Remaining" sortKey="remaining" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Est. Completion</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">GitHub</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-white/5">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-stone-500 dark:text-stone-400">
                  <div className="space-y-2">
                    <p>No interns match these filters.</p>
                    <button onClick={resetFilters} className="font-bold text-red-600 underline dark:text-red-400">Reset filters</button>
                  </div>
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
              const isAtRisk = atRiskIdSet.has(s.id)

              return (
                <tr key={s.id} className="transition hover:bg-stone-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-stone-900 dark:text-white">
                        {s.last_name}, {s.first_name}
                      </span>
                      {s.academic_term && (
                        <span className="text-[10px] text-stone-450 dark:text-stone-500 font-bold uppercase tracking-wider mt-0.5">
                          {s.academic_term} · {s.academic_year || ''}
                        </span>
                      )}
                      {isAtRisk && <span className="mt-1 w-fit rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Needs attention</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">{s.sr_code || '—'}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">{s.email || '—'}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{s.program}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{s.required_ojt_hours}h</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                        <div
                          className={`h-full rounded-full ${
                            isComplete ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-600 dark:text-stone-400">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isComplete ? (
                      <span className="badge-emerald">
                        Complete ✓
                      </span>
                    ) : (
                      <span className="text-stone-700 dark:text-stone-300">{Number(s.remaining_hours).toFixed(1)}h</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    {formatDate(s.estimated_completion_date)}
                  </td>
                  <td className="px-4 py-3">
                    {s.github_link ? (
                      <a
                        href={s.github_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 transition-colors dark:text-red-400 dark:hover:text-red-300"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-stone-400 dark:text-stone-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/${s.id}`}
                      className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors whitespace-nowrap dark:text-red-400 dark:hover:text-red-300"
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
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-stone-900 transition-colors dark:hover:text-white"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${current === sortKey ? 'text-red-600 dark:text-red-400' : ''}`} />
        {current === sortKey && (
          <span className="text-red-600 dark:text-red-400">{dir === 'asc' ? '↑' : '↓'}</span>
        )}
      </button>
    </th>
  )
}
