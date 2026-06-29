'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema, isSrCode } from '@/lib/validations'
import type { ActionResult } from '@/types'

export async function loginAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    identifier: formData.get('identifier') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  let email = parsed.data.identifier.trim()

  // If the identifier looks like an SR-Code, resolve it to an email
  if (isSrCode(email)) {
    const serviceClient = await createServiceClient()
    const { data: student } = await serviceClient
      .from('students')
      .select('email')
      .eq('sr_code', email)
      .single()

    if (!student?.email) {
      return { success: false, error: 'No account found with that SR-Code.' }
    }
    email = student.email
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signupAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    sr_code: formData.get('sr_code') as string,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    program: formData.get('program') as string,
    required_ojt_hours: Number(formData.get('required_ojt_hours')),
  }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // Create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Signup failed' }
  }

  // Use service role to bypass RLS for profile insert
  const serviceClient = await createServiceClient()

  // Check if SR-Code is already taken
  const { data: existingSr } = await serviceClient
    .from('students')
    .select('id')
    .eq('sr_code', parsed.data.sr_code)
    .maybeSingle()

  if (existingSr) {
    return { success: false, error: 'This SR-Code is already registered.' }
  }

  const { data: studentData, error: profileError } = await serviceClient.from('students').insert({
    auth_user_id: authData.user.id,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    sr_code: parsed.data.sr_code,
    email: parsed.data.email,
    program: parsed.data.program,
    required_ojt_hours: parsed.data.required_ojt_hours,
    role: 'student',
  }).select('id').single()

  if (profileError || !studentData) {
    return { success: false, error: profileError?.message ?? 'Failed to create profile' }
  }

  try {
    const { syncInternToSheets } = await import('@/lib/sync')
    await syncInternToSheets(studentData.id)
  } catch (err) {
    console.error('Failed to sync new student to sheets:', err)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
