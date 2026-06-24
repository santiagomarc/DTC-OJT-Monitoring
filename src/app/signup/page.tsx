import Link from 'next/link'
import { SignupForm } from '@/components/forms/SignupForm'

export const metadata = {
  title: 'Register — BatSU OJT Monitor',
}

export default function SignupPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 bg-stone-50 dark:bg-stone-950 overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 -mb-32 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-red-600 to-orange-700 text-3xl shadow-xl shadow-orange-500/20">
            🎓
          </div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">
            Create Your Account
          </h1>
          <p className="mt-2 text-sm font-medium text-stone-500 dark:text-stone-400">
            BatSU Digital Transformation Center
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200/80 bg-stone-50/80 dark:border-white/10 dark:bg-stone-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xl font-bold text-stone-900 dark:text-white uppercase tracking-wider">
            Intern Registration
          </h2>
          <SignupForm />
          <p className="mt-8 text-center text-sm font-medium text-stone-500 dark:text-stone-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors font-bold underline decoration-red-500/30 underline-offset-4 hover:decoration-red-500"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
