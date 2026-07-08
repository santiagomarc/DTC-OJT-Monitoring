'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { syncInternToSheets } from '@/lib/sync'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from './students'
import type { StudentProject } from '@/types'

const projectSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().min(1, 'Project name is required').max(300),
  github_link: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

/**
 * Get all projects for a specific student
 */
export async function getStudentProjects(studentId: string): Promise<StudentProject[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('student_projects')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true })

  return (data as StudentProject[]) ?? []
}

/**
 * Student: Add a new project (max 5 enforced)
 */
export async function addProjectAction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile) return { error: 'Unauthorized' }

  const rawData = {
    name: (formData.get('name') as string) || '',
    github_link: (formData.get('github_link') as string) || '',
  }

  const result = projectSchema.safeParse(rawData)
  if (!result.success) return { error: result.error.issues[0].message }

  const supabase = await createClient()

  // Enforce max 5 projects per intern
  const { count } = await supabase
    .from('student_projects')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', profile.id)

  if (count !== null && count >= 5) {
    return { error: 'Maximum of 5 projects allowed per intern.' }
  }

  const { error } = await supabase.from('student_projects').insert({
    student_id: profile.id,
    name: result.data.name,
    github_link: result.data.github_link || null,
  })

  if (error) return { error: error.message }

  syncInternToSheets(profile.id).catch((e) => {
    console.error('[projects] Sync after add failed:', e)
  })

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Student: Update an existing project
 */
export async function updateProjectAction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile) return { error: 'Unauthorized' }

  const rawData = {
    projectId: formData.get('projectId') as string,
    name: (formData.get('name') as string) || '',
    github_link: (formData.get('github_link') as string) || '',
  }

  const result = projectSchema.safeParse(rawData)
  if (!result.success || !result.data.projectId) {
    return { error: result.success ? 'Project ID missing' : result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('student_projects')
    .update({
      name: result.data.name,
      github_link: result.data.github_link || null,
    })
    .eq('id', result.data.projectId)
    .eq('student_id', profile.id) // Ensure they own it

  if (error) return { error: error.message }

  syncInternToSheets(profile.id).catch((e) => {
    console.error('[projects] Sync after update failed:', e)
  })

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Student: Delete an existing project
 */
export async function deleteProjectAction(
  projectId: string
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('student_projects')
    .delete()
    .eq('id', projectId)
    .eq('student_id', profile.id)

  if (error) return { error: error.message }

  syncInternToSheets(profile.id).catch((e) => {
    console.error('[projects] Sync after delete failed:', e)
  })

  revalidatePath('/dashboard')
  return { success: true }
}

// -------------------------------------------------------------
// Admin variants
// -------------------------------------------------------------

export async function adminAddProjectAction(
  internId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') return { error: 'Unauthorized' }

  const rawData = {
    name: (formData.get('name') as string) || '',
    github_link: (formData.get('github_link') as string) || '',
  }

  const result = projectSchema.safeParse(rawData)
  if (!result.success) return { error: result.error.issues[0].message }

  const supabase = await createClient()

  // Enforce max 5 projects per intern
  const { count } = await supabase
    .from('student_projects')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', internId)

  if (count !== null && count >= 5) {
    return { error: 'Maximum of 5 projects allowed per intern.' }
  }

  const { error } = await supabase.from('student_projects').insert({
    student_id: internId,
    name: result.data.name,
    github_link: result.data.github_link || null,
  })

  if (error) return { error: error.message }

  syncInternToSheets(internId).catch((e) => {
    console.error('[projects] Sync after admin add failed:', e)
  })

  revalidatePath(`/dashboard/admin/${internId}`)
  revalidatePath('/dashboard/admin')
  return { success: true }
}

export async function adminUpdateProjectAction(
  internId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') return { error: 'Unauthorized' }

  const rawData = {
    projectId: formData.get('projectId') as string,
    name: (formData.get('name') as string) || '',
    github_link: (formData.get('github_link') as string) || '',
  }

  const result = projectSchema.safeParse(rawData)
  if (!result.success || !result.data.projectId) {
    return { error: result.success ? 'Project ID missing' : result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('student_projects')
    .update({
      name: result.data.name,
      github_link: result.data.github_link || null,
    })
    .eq('id', result.data.projectId)
    .eq('student_id', internId) // Ensure it belongs to the target intern

  if (error) return { error: error.message }

  syncInternToSheets(internId).catch((e) => {
    console.error('[projects] Sync after admin update failed:', e)
  })

  revalidatePath(`/dashboard/admin/${internId}`)
  revalidatePath('/dashboard/admin')
  return { success: true }
}

export async function adminDeleteProjectAction(
  internId: string,
  projectId: string
): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('student_projects')
    .delete()
    .eq('id', projectId)
    .eq('student_id', internId)

  if (error) return { error: error.message }

  syncInternToSheets(internId).catch((e) => {
    console.error('[projects] Sync after admin delete failed:', e)
  })

  revalidatePath(`/dashboard/admin/${internId}`)
  revalidatePath('/dashboard/admin')
  return { success: true }
}
