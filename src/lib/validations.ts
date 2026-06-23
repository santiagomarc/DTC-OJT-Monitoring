import { z } from 'zod'

// SR-Code format: 2 digits, dash, 5 digits (e.g. 23-06643)
const srCodeRegex = /^\d{2}-\d{5}$/

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Enter your email or SR-Code'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
  email: z.string().email('Enter a valid school email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  sr_code: z
    .string()
    .regex(srCodeRegex, 'SR-Code must be in format XX-XXXXX (e.g. 23-06643)'),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  program: z.string().min(1, 'Program is required'),
  required_ojt_hours: z
    .number()
    .min(1, 'Must be at least 1 hour')
    .max(2000),
})

export const attendanceLogSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    time_in: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
    time_out: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
      .optional()
      .or(z.literal('')),
    planned_task: z.string().max(2000).optional().or(z.literal('')),
    actual_accomplishment: z.string().max(2000).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (!data.time_out || data.time_out === '') return true
      return data.time_out > data.time_in
    },
    { message: 'Time Out must be after Time In', path: ['time_out'] }
  )

export const studentProfileSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  sr_code: z.string().regex(srCodeRegex, 'SR-Code format: XX-XXXXX').optional().or(z.literal('')),
  program: z.string().min(1),
  required_ojt_hours: z.number().min(1).max(2000),
  assigned_project: z.string().max(300).optional().or(z.literal('')),
  github_link: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

/**
 * Returns true if the input looks like an SR-Code (XX-XXXXX).
 */
export function isSrCode(input: string): boolean {
  return srCodeRegex.test(input)
}

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type AttendanceLogInput = z.infer<typeof attendanceLogSchema>
export type StudentProfileInput = z.infer<typeof studentProfileSchema>
