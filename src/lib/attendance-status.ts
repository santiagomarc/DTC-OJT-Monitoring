import type { StudentProgress } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

export function getAtRiskStudentIds(students: StudentProgress[], asOf = new Date()): string[] {
  const cutoff = new Date(asOf)
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setTime(cutoff.getTime() - 7 * DAY_MS)

  return students
    .filter((student) => {
      if (Number(student.remaining_hours) <= 0) return false
      if (!student.last_attendance_date) return true
      return new Date(`${student.last_attendance_date}T00:00:00`) < cutoff
    })
    .map((student) => student.id)
}
