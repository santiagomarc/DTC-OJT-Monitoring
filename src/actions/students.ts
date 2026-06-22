'use server'

import { createClient } from '@/lib/supabase/server'
import type { Student, StudentProgress } from '@/types'

/**
 * Get the current logged-in user's student profile.
 */
export async function getMyProfile(): Promise<Student | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  return data as Student | null
}

/**
 * Get the current student's progress (rendered hours, remaining, etc.)
 */
export async function getMyProgress(): Promise<StudentProgress | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('student_progress')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  return data as StudentProgress | null
}

/**
 * Admin only: get all students' progress for the master dashboard.
 */
export async function getAllStudentProgress(): Promise<StudentProgress[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('student_progress')
    .select('*')
    .eq('role', 'student')
    .order('last_name', { ascending: true })

  return (data as StudentProgress[]) ?? []
}

/**
 * Admin only: get one student's progress by their student ID.
 */
export async function getStudentProgressById(
  studentId: string
): Promise<StudentProgress | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('student_progress')
    .select('*')
    .eq('id', studentId)
    .single()

  return data as StudentProgress | null
}
