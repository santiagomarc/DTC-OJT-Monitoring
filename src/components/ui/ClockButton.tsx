'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock } from 'lucide-react'
import { clockInAction, clockOutAction } from '@/actions/attendance'

interface ClockButtonProps {
  activeSessionId: string | null
  className?: string
}

export function ClockButton({ activeSessionId, className = '' }: ClockButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localActiveId, setLocalActiveId] = useState<string | null>(activeSessionId)

  // Keep local state in sync when server component re-renders/updates activeSessionId
  useEffect(() => {
    setLocalActiveId(activeSessionId)
  }, [activeSessionId])

  function handleClick() {
    startTransition(async () => {
      if (localActiveId) {
        const res = await clockOutAction(localActiveId)
        if (res.success) {
          setLocalActiveId(null)
          toast.success('Successfully clocked out!')
          router.refresh()
        } else {
          toast.error(res.error || 'Failed to clock out.')
        }
      } else {
        const res = await clockInAction()
        if (res.success && res.data) {
          setLocalActiveId(res.data.id)
          toast.success('Successfully clocked in!')
          router.refresh()
        } else {
          toast.error(res.error || 'Failed to clock in.')
        }
      }
    })
  }

  const isActive = !!localActiveId

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg transition-all duration-305 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 cursor-pointer ${
        isActive
          ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-orange-500/25'
          : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/25'
      } ${className}`}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>{isPending ? 'Processing…' : isActive ? 'Clock Out' : 'Clock In'}</span>
    </button>
  )
}
