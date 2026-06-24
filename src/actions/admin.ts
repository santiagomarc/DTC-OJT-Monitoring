'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from './students'
import { z } from 'zod'

const editInternSchema = z.object({
  studentId: z.string(),
  required_ojt_hours: z.number().min(1),
  assigned_project: z.string().optional(),
  github_link: z.string().url().optional().or(z.literal('')),
})

export async function editInternAction(formData: FormData) {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const rawData = {
    studentId: formData.get('studentId') as string,
    required_ojt_hours: Number(formData.get('required_ojt_hours')),
    assigned_project: formData.get('assigned_project') as string,
    github_link: formData.get('github_link') as string,
  }

  const result = editInternSchema.safeParse(rawData)
  if (!result.success) {
    return { error: 'Invalid data' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      required_ojt_hours: result.data.required_ojt_hours,
      assigned_project: result.data.assigned_project || null,
      github_link: result.data.github_link || null,
    })
    .eq('id', result.data.studentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin')
  revalidatePath(`/dashboard/admin/${result.data.studentId}`)
  return { success: true }
}

const manualLogSchema = z.object({
  studentId: z.string(),
  date: z.string(),
  time_in: z.string(),
  time_out: z.string(),
  task_description: z.string().min(5),
})

export async function addManualLogAction(formData: FormData) {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const rawData = {
    studentId: formData.get('studentId') as string,
    date: formData.get('date') as string,
    time_in: formData.get('time_in') as string,
    time_out: formData.get('time_out') as string,
    task_description: formData.get('task_description') as string,
  }

  const result = manualLogSchema.safeParse(rawData)
  if (!result.success) {
    return { error: 'Invalid data' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('attendance_logs').insert({
    student_id: result.data.studentId,
    date: result.data.date,
    time_in: result.data.time_in,
    time_out: result.data.time_out,
    task_description: result.data.task_description,
    status: 'approved', // Manual logs by admin are auto-approved
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin')
  revalidatePath(`/dashboard/admin/${result.data.studentId}`)
  return { success: true }
}
