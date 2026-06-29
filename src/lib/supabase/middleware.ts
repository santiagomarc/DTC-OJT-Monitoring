import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes & API routes — resolve instantly with 0ms overhead
  const publicPaths = ['/login', '/signup', '/']
  if (publicPaths.includes(pathname) || pathname.startsWith('/api/')) {
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

  // If no session, redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-user-email', user.email || '')

  // Admin route protection: check role from database
  if (pathname.startsWith('/dashboard/admin')) {
    const { data: profile } = await supabase
      .from('students')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  supabaseResponse.headers.forEach((value, key) => {
    finalResponse.headers.set(key, value)
  })
  return finalResponse
}
