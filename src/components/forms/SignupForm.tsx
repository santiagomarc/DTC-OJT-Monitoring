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
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-1.5">
            First Name
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            placeholder="Maria"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-1.5">
            Last Name
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            placeholder="De Leon"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          placeholder="you@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="program" className="block text-sm font-medium text-gray-300 mb-1.5">
            Program
          </label>
          <select
            id="program"
            name="program"
            required
            className="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          >
            <option value="">Select…</option>
            {PROGRAMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="required_ojt_hours" className="block text-sm font-medium text-gray-300 mb-1.5">
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
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          placeholder="Min. 6 characters"
        />
      </div>

      {state.error && !state.success && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 border border-red-500/20">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
