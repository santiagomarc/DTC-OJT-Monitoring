'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, X } from 'lucide-react'

const STALE_MINUTES = 5
const DISMISSED_KEY = 'ojt_stale_banner_dismissed_at'

/**
 * SyncRefreshBanner
 *
 * Shows a gentle reminder to refresh the page after STALE_MINUTES minutes
 * of inactivity (i.e. the user hasn't navigated away). This is the lightest
 * possible alternative to real-time subscriptions for a 10-person team.
 *
 * • Appears after 5 minutes of the page being open.
 * • Has a one-click Refresh button and a dismiss (×) button.
 * • Dismissing hides it for the rest of the session (sessionStorage).
 * • Also shows if the user has been on the tab for > STALE_MINUTES after
 *   returning to a hidden tab (visibilitychange event).
 */
export function SyncRefreshBanner() {
  const [visible, setVisible] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const dismiss = useCallback(() => {
    setVisible(false)
    try {
      sessionStorage.setItem(DISMISSED_KEY, Date.now().toString())
    } catch {
      // sessionStorage may be unavailable in some contexts
    }
  }, [])

  const handleRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  useEffect(() => {
    // Check if the user dismissed the banner recently in this session
    const isDismissed = () => {
      try {
        const ts = sessionStorage.getItem(DISMISSED_KEY)
        if (!ts) return false
        // Reset dismissal after 30 minutes so they get reminded again later
        return Date.now() - Number(ts) < 30 * 60 * 1000
      } catch {
        return false
      }
    }

    if (isDismissed()) return

    // Timer: show banner after STALE_MINUTES on the page
    const staleMs = STALE_MINUTES * 60 * 1000
    const timer = setTimeout(() => {
      if (!isDismissed()) setVisible(true)
    }, staleMs)

    // Also show banner when the user returns to a tab that's been in the background
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isDismissed()) {
        // Only show if the timer has already fired (page is stale)
        // We track this by checking if the banner was supposed to show
        const pageOpenedAt = Number(sessionStorage.getItem('ojt_page_opened_at') || Date.now())
        if (Date.now() - pageOpenedAt > staleMs) {
          setVisible(true)
        }
      }
    }

    // Record when the page was first opened
    try {
      if (!sessionStorage.getItem('ojt_page_opened_at')) {
        sessionStorage.setItem('ojt_page_opened_at', Date.now().toString())
      }
    } catch {/* noop */}

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Countdown ticker: once visible, count down 3 seconds then auto-hide (not auto-refresh)
  useEffect(() => {
    if (!visible) {
      setCountdown(null)
      return
    }
    // No auto-refresh — just a persistent banner until user acts
  }, [visible])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-gray-900/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300"
    >
      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
        <RefreshCw className="h-4 w-4 text-violet-400 animate-spin [animation-duration:3s]" />
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">Data may be outdated</p>
        <p className="text-xs text-gray-400">
          {countdown !== null
            ? `Auto-refreshing in ${countdown}s…`
            : 'Refresh to see the latest updates from the sheet.'}
        </p>
      </div>

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        Refresh
      </button>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 transition hover:bg-white/10 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
