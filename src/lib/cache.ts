import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Student } from '@/types'

/**
 * Retrieve and cache the authenticated user.
 * This eliminates redundant calls to supabase.auth.getUser() across components in a single request.
 */
export const getCachedUser = cache(async () => {
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
