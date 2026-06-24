'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { syncStudentToSheets } from '@/lib/sync'
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

const updateProfileSchema = z.object({
  assigned_project: z.string().max(300).optional(),
  github_link: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

/**
 * Update the logged-in student's project and/or GitHub link.
 */
export async function updateStudentProfileAction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile) {
    return { error: 'Unauthorized' }
  }

  const rawData: any = {}
  if (formData.has('assigned_project')) {
    rawData.assigned_project = (formData.get('assigned_project') as string) || ''
  }
  if (formData.has('github_link')) {
    rawData.github_link = (formData.get('github_link') as string) || ''
  }

  const result = updateProfileSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const updatePayload: any = {}
  if ('assigned_project' in result.data) {
    updatePayload.assigned_project = result.data.assigned_project || null
  }
  if ('github_link' in result.data) {
    updatePayload.github_link = result.data.github_link || null
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('students')
    .update(updatePayload)
    .eq('id', profile.id)

  if (error) return { error: error.message }

  // Sync back to Google Sheets
  try {
    await syncStudentToSheets(profile.id)
  } catch (e) {
    console.error('[students] Sync after updateStudentProfileAction failed:', e)
  }

  revalidatePath('/dashboard')
  return { success: true }
}
