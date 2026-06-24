'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { attendanceLogSchema } from '@/lib/validations'
import { syncStudentToSheets } from '@/lib/sync'
import type { ActionResult, AttendanceLog } from '@/types'

/**
 * Gets the current logged-in student's DB ID.
 * Returns null if unauthenticated.
 */
async function getStudentId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  return data?.id ?? null
}

/**
 * CREATE — Add a new attendance log entry.
 */
export async function createAttendanceLog(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult<AttendanceLog>> {
  const studentId = await getStudentId()
  if (!studentId) return { success: false, error: 'Not authenticated' }

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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({
      student_id: studentId,
      date: parsed.data.date,
      time_in: parsed.data.time_in + ':00',
      time_out: parsed.data.time_out
        ? parsed.data.time_out + ':00'
        : null,
      planned_task: parsed.data.planned_task || null,
      actual_accomplishment: parsed.data.actual_accomplishment || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You already have a log entry for this date.' }
    }
    return { success: false, error: error.message }
  }

  // Sync to Sheets
  try {
    await syncStudentToSheets(studentId)
  } catch (e) {
    console.error('[sync] Sync failed:', e)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/logs')
  return { success: true, data: data as AttendanceLog }
}

/**
 * UPDATE — Edit an existing attendance log entry.
 */
export async function updateAttendanceLog(
  logId: string,
  _: ActionResult,
  formData: FormData
): Promise<ActionResult<AttendanceLog>> {
  const studentId = await getStudentId()
  if (!studentId) return { success: false, error: 'Not authenticated' }

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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_logs')
    .update({
      date: parsed.data.date,
      time_in: parsed.data.time_in + ':00',
      time_out: parsed.data.time_out
        ? parsed.data.time_out + ':00'
        : null,
      planned_task: parsed.data.planned_task || null,
      actual_accomplishment: parsed.data.actual_accomplishment || null,
    })
    .eq('id', logId)
    .eq('student_id', studentId) // RLS double-check
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Sync to Sheets
  try {
    await syncStudentToSheets(studentId)
  } catch (e) {
    console.error('[sync] Sync failed:', e)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/logs')
  return { success: true, data: data as AttendanceLog }
}

/**
 * DELETE — Remove an attendance log entry.
 */
export async function deleteAttendanceLog(
  logId: string
): Promise<ActionResult> {
  const studentId = await getStudentId()
  if (!studentId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance_logs')
    .delete()
    .eq('id', logId)
    .eq('student_id', studentId)

  if (error) return { success: false, error: error.message }

  // Sync to Sheets
  try {
    await syncStudentToSheets(studentId)
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
  const studentId = await getStudentId()
  if (!studentId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })

  return (data as AttendanceLog[]) ?? []
}
