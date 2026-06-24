'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getMyProfile } from './students'
import { syncStudentToSheets } from '@/lib/sync'
import { z } from 'zod'

const editInternSchema = z.object({
  studentId: z.string().uuid(),
  required_ojt_hours: z.number().min(1).max(2000),
  assigned_project: z.string().max(300).optional().or(z.literal('')),
  github_link: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

/**
 * Admin: update an intern's required hours, project, and github link.
 */
export async function editInternAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const rawData = {
    studentId: formData.get('studentId') as string,
    required_ojt_hours: Number(formData.get('required_ojt_hours')),
    assigned_project: (formData.get('assigned_project') as string) || '',
    github_link: (formData.get('github_link') as string) || '',
  }

  const result = editInternSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  // Use the service client to bypass RLS for admin updates
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('students')           // ← was 'profiles' (wrong table)
    .update({
      required_ojt_hours: result.data.required_ojt_hours,
      assigned_project: result.data.assigned_project || null,
      github_link: result.data.github_link || null,
    })
    .eq('id', result.data.studentId)

  if (error) return { error: error.message }

  // Sync the updated profile back to Google Sheets
  syncStudentToSheets(result.data.studentId).catch((e) =>
    console.error('[admin] Sync after editIntern failed:', e)
  )

  revalidatePath('/dashboard/admin')
  revalidatePath(`/dashboard/admin/${result.data.studentId}`)
  return { success: true }
}

const manualLogSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time_in: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format'),
  time_out: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format').optional().or(z.literal('')),
  planned_task: z.string().min(1, 'Task description is required').max(2000),
  actual_accomplishment: z.string().max(2000).optional().or(z.literal('')),
})

/**
 * Admin: manually add an attendance log for any intern.
 * Useful for retroactively logging missed entries.
 */
export async function addManualLogAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const rawData = {
    studentId: formData.get('studentId') as string,
    date: formData.get('date') as string,
    time_in: formData.get('time_in') as string,
    time_out: (formData.get('time_out') as string) || '',
    planned_task: formData.get('planned_task') as string,
    actual_accomplishment: (formData.get('actual_accomplishment') as string) || '',
  }

  const result = manualLogSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  // Normalise time strings to HH:MM:00
  const normaliseTime = (t: string) => (t.length === 5 ? t + ':00' : t)

  const supabase = await createClient()
  const { error } = await supabase.from('attendance_logs').insert({
    student_id: result.data.studentId,
    date: result.data.date,
    time_in: normaliseTime(result.data.time_in),
    time_out: result.data.time_out ? normaliseTime(result.data.time_out) : null,
    planned_task: result.data.planned_task,
    actual_accomplishment: result.data.actual_accomplishment || null,
    // NOTE: total_hours is a GENERATED column — do not insert it
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'An attendance log already exists for this student on that date.' }
    }
    return { error: error.message }
  }

  // Sync the updated logs to Google Sheets
  syncStudentToSheets(result.data.studentId).catch((e) =>
    console.error('[admin] Sync after addManualLog failed:', e)
  )

  revalidatePath('/dashboard/admin')
  revalidatePath(`/dashboard/admin/${result.data.studentId}`)
  return { success: true }
}
