import Link from 'next/link'
import { LoginForm } from '@/components/forms/LoginForm'

export const metadata = {
  title: 'Login — BatSU OJT Monitor',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-3xl shadow-lg shadow-violet-500/25">
            🎓
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">BatSU OJT Monitor</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Digital Transformation Center
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">Sign in</h2>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No account yet?{' '}
            <Link
              href="/signup"
              className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
