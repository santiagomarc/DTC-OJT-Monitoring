'use client'

import { useActionState } from 'react'
import { signupAction } from '@/actions/auth'
import type { ActionResult } from '@/types'

const initialState: ActionResult = { success: false }

const PROGRAMS = ['BSIT', 'BSCS', 'BSECE', 'BSCPE', 'BSEE', 'BSME', 'BSA', 'BSBA', 'Other']

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="label">
            First Name
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            className="input"
            placeholder="Maria"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="label">
            Last Name
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            className="input"
            placeholder="De Leon"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="sr_code" className="label">
          SR-Code (e.g. 23-06643)
        </label>
        <input
          id="sr_code"
          name="sr_code"
          type="text"
          required
          pattern="\d{2}-\d{5}"
          className="input"
          placeholder="23-06643"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="program" className="label">
            Program
          </label>
          <select
            id="program"
            name="program"
            required
            className="input"
          >
            <option value="">Select…</option>
            {PROGRAMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="required_ojt_hours" className="label">
            Required Hours
          </label>
          <input
            id="required_ojt_hours"
            name="required_ojt_hours"
            type="number"
            defaultValue={486}
            min={1}
            max={2000}
            required
            className="input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="input"
          placeholder="Min. 6 characters"
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
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      >
        {isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
