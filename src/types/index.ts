export type UserRole = 'student' | 'admin'

export interface Student {
  id: string
  auth_user_id: string
  last_name: string
  first_name: string
  sr_code: string | null
  email: string | null
  program: string
  required_ojt_hours: number
  assigned_project: string | null
  github_link: string | null
  project_github_link: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface AttendanceLog {
  id: string
  student_id: string
  date: string           // ISO date string: "2026-06-22"
  time_in: string        // "08:00:00"
  time_out: string | null
  total_hours: number | null  // generated column
  planned_task: string | null
  actual_accomplishment: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface StudentProgress {
  id: string
  auth_user_id: string
  last_name: string
  first_name: string
  sr_code: string | null
  email: string | null
  program: string
  required_ojt_hours: number
  assigned_project: string | null
  github_link: string | null
  project_github_link: string | null
  role: UserRole
  total_rendered_hours: number
  remaining_hours: number
  estimated_completion_date: string | null
  total_days_logged: number
  last_attendance_date: string | null
}

// Form value types (before DB insert)
export interface AttendanceLogFormValues {
  date: string
  time_in: string
  time_out: string
  planned_task: string
  actual_accomplishment: string
}

export interface StudentProfileFormValues {
  first_name: string
  last_name: string
  sr_code: string
  program: string
  required_ojt_hours: number
  assigned_project: string
  github_link: string
  project_github_link: string
}

// Action response type
export interface ActionResult<T = null> {
  success: boolean
  data?: T
  error?: string
}
