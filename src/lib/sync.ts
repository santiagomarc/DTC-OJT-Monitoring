import { getSheetsClient, SPREADSHEET_ID, MASTER_SHEET_NAME } from './google-sheets'
import { createServiceClient } from './supabase/server'
import type { StudentProgress, AttendanceLog } from '@/types'

/**
 * Formats a DATE string (YYYY-MM-DD) → MM/DD/YYYY for the sheet
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}

/**
 * Formats a TIME string (HH:MM:SS) → hh:mm AM/PM for the sheet
 */
function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  const [hourStr, min] = timeStr.split(':')
  const hour = parseInt(hourStr, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${min} ${ampm}`
}

/**
 * Sanitizes a student name for use as a Google Sheet tab name.
 * Sheet names cannot exceed 100 chars or contain: \ / ? * [ ]
 */
function toSheetTabName(lastName: string, firstName: string): string {
  return `${lastName}, ${firstName}`
    .replace(/[\\/?*[\]]/g, '')
    .substring(0, 100)
}

/**
 * Ensures a sheet tab with the given name exists in the spreadsheet.
 * Creates it if missing.
 */
async function ensureSheetTab(
  sheets: ReturnType<typeof getSheetsClient>,
  tabName: string
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === tabName
  )

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: tabName },
            },
          },
        ],
      },
    })
  }
}

/**
 * Finds the row index (1-based) of a student in the Master sheet by student ID.
 * Assumes column A holds student UUIDs (hidden but reliable key).
 * Returns -1 if not found.
 */
async function findMasterRow(
  sheets: ReturnType<typeof getSheetsClient>,
  studentId: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MASTER_SHEET_NAME}!A:A`,
  })
  const rows = res.data.values ?? []
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === studentId) return i + 1 // 1-based
  }
  return -1
}

/**
 * Core sync function: pushes one student's data to Google Sheets.
 * - Updates (or appends) the Master sheet row.
 * - Overwrites the student's individual attendance tab.
 *
 * This is intentionally idempotent — safe to call multiple times.
 */
export async function syncStudentToSheets(studentId: string): Promise<void> {
  const supabase = await createServiceClient()
  const sheets = getSheetsClient()

  // ── 1. Fetch student progress ─────────────────────────────
  const { data: progress, error: progressError } = await supabase
    .from('student_progress')
    .select('*')
    .eq('id', studentId)
    .single<StudentProgress>()

  if (progressError || !progress) {
    console.error('[sync] Failed to fetch student progress:', progressError)
    return
  }

  // ── 2. Fetch attendance logs ──────────────────────────────
  const { data: logs, error: logsError } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: true })

  if (logsError) {
    console.error('[sync] Failed to fetch attendance logs:', logsError)
    return
  }

  // ── 3. Update Master Sheet ────────────────────────────────
  const masterRow: (string | number)[] = [
    progress.id,                                          // col A — hidden ID key
    progress.last_name,                                   // col B
    progress.first_name,                                  // col C
    progress.program,                                     // col D
    progress.required_ojt_hours,                          // col E
    progress.remaining_hours,                             // col F
    formatDate(progress.estimated_completion_date),       // col G
    '',                                                   // col H — actual completion (manual)
    progress.assigned_project ?? '',                      // col I
    progress.github_link ?? '',                           // col J
  ]

  let rowIndex = await findMasterRow(sheets, studentId)

  if (rowIndex === -1) {
    // Student not yet in master sheet — append a new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MASTER_SHEET_NAME}!A:J`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [masterRow] },
    })
  } else {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MASTER_SHEET_NAME}!A${rowIndex}:J${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [masterRow] },
    })
  }

  // ── 4. Update individual attendance tab ───────────────────
  const tabName = toSheetTabName(progress.last_name, progress.first_name)
  await ensureSheetTab(sheets, tabName)

  // Header row + data rows
  const headerRow = [
    'Date', 'Time In', 'Time Out',
    'Total Hours', 'Planned Task / Activities', 'Actual Accomplishment',
  ]

  const attendanceRows: (string | number | null)[][] = (logs ?? []).map(
    (log: AttendanceLog) => [
      formatDate(log.date),
      formatTime(log.time_in),
      formatTime(log.time_out),
      log.total_hours ?? '',
      log.planned_task ?? '',
      log.actual_accomplishment ?? '',
    ]
  )

  const allRows = [headerRow, ...attendanceRows]

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'!A1:F${allRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: allRows },
  })

  console.log(`[sync] ✅ Synced ${progress.last_name}, ${progress.first_name} to Sheets`)
}

/**
 * Full reconciliation: syncs ALL students to Sheets.
 * Used by the cron job as a fallback.
 */
export async function syncAllStudentsToSheets(): Promise<void> {
  const supabase = await createServiceClient()

  const { data: students, error } = await supabase
    .from('students')
    .select('id')
    .eq('role', 'student')

  if (error || !students) {
    console.error('[sync] Failed to fetch students for full sync:', error)
    return
  }

  for (const student of students) {
    await syncStudentToSheets(student.id)
  }

  console.log(`[sync] ✅ Full reconciliation complete — synced ${students.length} students`)
}
