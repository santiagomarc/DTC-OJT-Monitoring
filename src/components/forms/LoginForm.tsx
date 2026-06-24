'use client'

import { useActionState } from 'react'
import { loginAction } from '@/actions/auth'
import type { ActionResult } from '@/types'

const initialState: ActionResult = { success: false }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="identifier" className="label">
          Email or SR-Code
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          className="input"
          placeholder="you@g.batstate-u.edu.ph or 23-06643"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
      </div>

      {state.error && !state.success && (
        <p className="rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 px-4 py-2.5 text-sm dark:text-red-400 dark:border-red-500/20">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
