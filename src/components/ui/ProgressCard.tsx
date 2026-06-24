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
    <div className="space-y-6">
      {/* 4-stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Hours Rendered"
          value={`${Number(progress.total_rendered_hours).toFixed(1)}h`}
          sub={`of ${progress.required_ojt_hours}h required`}
          color="violet"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Remaining Hours"
          value={isComplete ? '0h' : `${Number(progress.remaining_hours).toFixed(1)}h`}
          sub={isComplete ? 'Completed!' : 'left to complete'}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Days Logged"
          value={`${progress.total_days_logged}`}
          sub="attendance entries"
          color="emerald"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Est. Completion"
          value={formatDate(progress.estimated_completion_date)}
          sub={progress.last_attendance_date ? `Last log: ${formatDate(progress.last_attendance_date)}` : 'No logs yet'}
          color="sky"
        />
      </div>

      {/* Progress bar card */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 dark:border-white/10 dark:bg-stone-900/40 backdrop-blur-md shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">Overall Internship Progress</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Total completion percentage based on rendered hours</p>
          </div>
          <span className="text-2xl font-black text-red-600 dark:text-red-400">{pct}%</span>
        </div>
        
        <div className="relative h-4 w-full overflow-hidden rounded-full bg-stone-150 dark:bg-stone-800">
          {/* Glowing bar */}
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : pct >= 75
                ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                : pct >= 50
                ? 'bg-gradient-to-r from-orange-600 to-red-500'
                : 'bg-gradient-to-r from-amber-500 to-orange-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        
        {isComplete && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span>🎉 Congratulations! You&apos;ve completed all required OJT hours!</span>
          </div>
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

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  const colorClasses = {
    violet: {
      bg: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
      border: 'hover:border-red-300 dark:hover:border-red-500/30',
      glow: 'group-hover:shadow-red-500/5',
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      border: 'hover:border-amber-300 dark:hover:border-amber-500/30',
      glow: 'group-hover:shadow-amber-500/5',
    },
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      border: 'hover:border-emerald-300 dark:hover:border-emerald-500/30',
      glow: 'group-hover:shadow-emerald-500/5',
    },
    sky: {
      bg: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
      border: 'hover:border-sky-300 dark:hover:border-sky-500/30',
      glow: 'group-hover:shadow-sky-500/5',
    },
  }

  const activeColor = colorClasses[color]

  return (
    <div className={`group relative rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-white/10 dark:bg-stone-900/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${activeColor.border} ${activeColor.glow}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          {label}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${activeColor.bg}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">{sub}</p>
    </div>
  )
}
