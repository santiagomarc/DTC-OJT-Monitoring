import { Clock, LogOut } from 'lucide-react'
import { logoutAction } from '@/actions/auth'

export const metadata = { title: 'Pending Approval — BatSU OJT Monitor' }

export default function PendingApprovalPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 bg-stone-50 dark:bg-stone-950 overflow-hidden">
      {/* Background ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 -mb-32 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="rounded-3xl border border-stone-200/80 bg-white/85 dark:border-white/10 dark:bg-stone-900/40 p-10 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-white uppercase">
            Account Pending Approval
          </h1>
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-450 leading-relaxed">
            Your registration has been submitted successfully.
            An administrator will review and approve your account shortly.
            You will be able to access the dashboard once approved.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-bold text-stone-600 transition hover:bg-stone-50 hover:text-stone-900 dark:border-white/10 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-white/5 cursor-pointer shadow-sm"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
