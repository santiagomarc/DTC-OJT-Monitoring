import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes & explicit public API routes — resolve instantly with 0ms overhead
  const publicPaths = ['/login', '/signup', '/', '/pending-approval']
  const publicApiPaths = ['/api/cron', '/api/webhooks/sheets']
  if (publicPaths.includes(pathname) || publicApiPaths.includes(pathname)) {
    return NextResponse.next({ request })
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-user-id')
  requestHeaders.delete('x-user-email')

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not add code between createServerClient and auth.getUser()
  const { data: { user } } = await supabase.auth.getUser()

  // If no session, redirect to login with refreshed session cleanup/cookies
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-user-email', user.email || '')

  // ── Approval gate and Role check: consolidated single query ──
  if (pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('students')
      .select('role, is_approved')
      .eq('auth_user_id', user.id)
      .single()

    // 1. Approval Gate: block unapproved students from entering /dashboard
    if (profile && !profile.is_approved && profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/pending-approval'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      return redirectResponse
    }

    // 2. Admin Route Protection: check role from database for /dashboard/admin
    if (pathname.startsWith('/dashboard/admin')) {
      if (!profile || profile.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
      }
    }
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Copy all cookies from supabaseResponse to finalResponse to preserve all Set-Cookie headers
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  return finalResponse
}
