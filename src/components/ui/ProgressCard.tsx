import type { StudentProgress } from '@/types'
import { Clock, CheckCircle, TrendingUp, Calendar } from 'lucide-react'

interface ProgressCardProps {
  progress: StudentProgress
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProgressCard({ progress }: ProgressCardProps) {
  const pct = Math.min(
    100,
    Math.round(
      (Number(progress.total_rendered_hours) / progress.required_ojt_hours) * 100
    )
  )

  const isComplete = progress.remaining_hours <= 0

  return (
    <div className="space-y-4">
      {/* 4-stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-violet-400" />}
          label="Hours Rendered"
          value={`${Number(progress.total_rendered_hours).toFixed(1)}h`}
          sub={`of ${progress.required_ojt_hours}h required`}
          color="violet"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-400" />}
          label="Remaining Hours"
          value={isComplete ? '0h' : `${Number(progress.remaining_hours).toFixed(1)}h`}
          sub={isComplete ? 'Completed!' : 'left to complete'}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          label="Days Logged"
          value={`${progress.total_days_logged}`}
          sub="attendance entries"
          color="emerald"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-sky-400" />}
          label="Est. Completion"
          value={formatDate(progress.estimated_completion_date)}
          sub={progress.last_attendance_date ? `Last log: ${formatDate(progress.last_attendance_date)}` : 'No logs yet'}
          color="sky"
        />
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Overall Progress</span>
          <span className="text-sm font-bold text-white">{pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isComplete
                ? 'bg-emerald-500'
                : pct >= 75
                ? 'bg-violet-500'
                : pct >= 50
                ? 'bg-indigo-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {isComplete && (
          <p className="mt-3 text-center text-sm font-medium text-emerald-400">
            🎉 Congratulations! You&apos;ve completed your OJT hours!
          </p>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: 'violet' | 'amber' | 'emerald' | 'sky'
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
    </div>
  )
}
