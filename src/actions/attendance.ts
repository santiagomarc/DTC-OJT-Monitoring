'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { attendanceLogSchema } from '@/lib/validations'
import { syncInternToSheets } from '@/lib/sync'
import { getCachedInternId } from '@/lib/cache'
import type { ActionResult, AttendanceLog } from '@/types'

/**
 * Gets the current logged-in student's DB ID.
 * Returns null if unauthenticated.
 */
async function getInternId(): Promise<string | null> {
  return getCachedInternId()
}

/**
 * CREATE — Add a new attendance log entry.
 */
export async function createAttendanceLog(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult<AttendanceLog>> {
  const internId = await getInternId()
  if (!internId) return { success: false, error: 'Not authenticated' }

  const raw = {
    date: formData.get('date') as string,
    time_in: formData.get('time_in') as string,
    time_out: formData.get('time_out') as string,
    planned_task: formData.get('planned_task') as string,
    actual_accomplishment: formData.get('actual_accomplishment') as string,
  }

  const parsed = attendanceLogSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const photoUrl = (formData.get('photo_url') as string) || null

  if (photoUrl && !photoUrl.startsWith('http')) {
    return { success: false, error: 'Invalid photo URL format.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({
      student_id: internId,
      date: parsed.data.date,
      time_in: parsed.data.time_in + ':00',
      time_out: parsed.data.time_out
        ? parsed.data.time_out + ':00'
        : null,
      planned_task: parsed.data.planned_task || null,
      actual_accomplishment: parsed.data.actual_accomplishment || null,
      photo_url: photoUrl,
    })
    .select()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You already have a log entry for this date.' }
    }
    return { success: false, error: error.message }
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'Failed to create attendance entry.' }
  }

  // Sync to Sheets
  try {
    await syncInternToSheets(internId)
  } catch (e) {
    console.error('[sync] Sync failed:', e)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/logs')
  return { success: true, data: data[0] as AttendanceLog }
}

/**
 * UPDATE — Edit an existing attendance log entry.
 */
export async function updateAttendanceLog(
  logId: string,
  _: ActionResult,
  formData: FormData
): Promise<ActionResult<AttendanceLog>> {
  const internId = await getInternId()
  if (!internId) return { success: false, error: 'Not authenticated' }

  const raw = {
    date: formData.get('date') as string,
    time_in: formData.get('time_in') as string,
    time_out: formData.get('time_out') as string,
    planned_task: formData.get('planned_task') as string,
    actual_accomplishment: formData.get('actual_accomplishment') as string,
  }

  const parsed = attendanceLogSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const removePhoto = formData.get('remove_photo') === 'true'
  const photoUrl = (formData.get('photo_url') as string) || null

  if (photoUrl && !photoUrl.startsWith('http')) {
    return { success: false, error: 'Invalid photo URL format.' }
  }

  const supabase = await createClient()

  const updatePayload: any = {
    date: parsed.data.date,
    time_in: parsed.data.time_in + ':00',
    time_out: parsed.data.time_out
      ? parsed.data.time_out + ':00'
      : null,
    planned_task: parsed.data.planned_task || null,
    actual_accomplishment: parsed.data.actual_accomplishment || null,
  }

  if (removePhoto) {
    updatePayload.photo_url = null
  } else if (photoUrl) {
    updatePayload.photo_url = photoUrl
  }

  const { data, error } = await supabase
    .from('attendance_logs')
    .update(updatePayload)
    .eq('id', logId)
    .eq('student_id', internId) // RLS double-check
    .select()

  if (error) return { success: false, error: error.message }
  if (!data || data.length === 0) {
    return { success: false, error: 'No attendance entry found to update.' }
  }

  // Sync to Sheets
  try {
    await syncInternToSheets(internId)
  } catch (e) {
    console.error('[sync] Sync failed:', e)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/logs')
  return { success: true, data: data[0] as AttendanceLog }
}

/**
 * DELETE — Remove an attendance log entry.
 */
export async function deleteAttendanceLog(
  logId: string
): Promise<ActionResult> {
  const internId = await getInternId()
  if (!internId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance_logs')
    .delete()
    .eq('id', logId)
    .eq('student_id', internId)

  if (error) return { success: false, error: error.message }

  // Sync to Sheets
  try {
    await syncInternToSheets(internId)
  } catch (e) {
    console.error('[sync] Sync failed:', e)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/logs')
  return { success: true }
}

/**
 * READ — Get all logs for the current student (for Server Components).
 */
export async function getMyAttendanceLogs(): Promise<AttendanceLog[]> {
  const internId = await getInternId()
  if (!internId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('student_id', internId)
    .order('date', { ascending: false })

  return (data as AttendanceLog[]) ?? []
}
