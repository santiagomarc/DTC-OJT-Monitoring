import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { Student } from '@/types'

/**
 * Retrieve and cache the authenticated user.
 * This checks forwarded headers first to avoid an external auth server roundtrip.
 */
export const getCachedUser = cache(async () => {
  try {
    const headersList = await headers()
    const userId = headersList.get('x-user-id')
    const userEmail = headersList.get('x-user-email')

    if (userId) {
      return {
        id: userId,
        email: userEmail,
      } as any
    }
  } catch (e) {
    // headers() might throw in static rendering or pre-render contexts, safe to ignore and fall back
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Retrieve and cache the current logged-in user's student profile.
 * Eliminates redundant queries to the 'students' table.
 */
export const getCachedProfile = cache(async (): Promise<Student | null> => {
  const user = await getCachedUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  return data as Student | null
})

/**
 * Retrieve and cache the student's internal UUID.
 * Eliminates duplicate student ID lookups.
 */
export const getCachedInternId = cache(async (): Promise<string | null> => {
  const profile = await getCachedProfile()
  return profile?.id ?? null
})
