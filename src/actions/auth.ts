'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from '@/lib/validations'
import type { ActionResult } from '@/types'

export async function loginAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

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

  // Create the student profile
  const { error: profileError } = await supabase.from('students').insert({
    auth_user_id: authData.user.id,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    program: parsed.data.program,
    required_ojt_hours: parsed.data.required_ojt_hours,
    role: 'student',
  })

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
