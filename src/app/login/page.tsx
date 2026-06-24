import Link from 'next/link'
import { LoginForm } from '@/components/forms/LoginForm'

export const metadata = {
  title: 'Login — BatSU OJT Monitor',
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 -mb-32 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 text-3xl shadow-xl shadow-indigo-500/20">
            🎓
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            BatSU OJT Monitor
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Digital Transformation Center
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-gray-200/80 bg-white/70 dark:border-white/10 dark:bg-gray-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Sign in
          </h2>
          <LoginForm />
          <p className="mt-8 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            No account yet?{' '}
            <Link
              href="/signup"
              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors font-bold underline decoration-violet-500/30 underline-offset-4 hover:decoration-violet-500"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
