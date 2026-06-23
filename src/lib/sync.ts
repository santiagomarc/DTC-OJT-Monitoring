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
 * Returns the short day name (e.g. Mon, Tue) from a YYYY-MM-DD string
 */
function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
}

/**
 * Sanitizes a student name for use as a Google Sheet tab name in ALL CAPS.
 * Sheet names cannot exceed 100 chars or contain: \ / ? * [ ]
 */
function toSheetTabName(lastName: string, firstName: string): string {
  return `${lastName}, ${firstName}`
    .replace(/[\\/?*[\]]/g, '')
    .toUpperCase()
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
    // Look for a template tab (usually "Copy of LASTNAME, FIRST NAME, MI." or similar)
    const templateSheet = meta.data.sheets?.find((s) => {
      const title = s.properties?.title || ''
      return title.toUpperCase().includes('LASTNAME, FIRST NAME')
    })

    if (templateSheet && templateSheet.properties?.sheetId !== undefined) {
      console.log(`[sync] Duplicating template sheet "${templateSheet.properties.title}" for new tab: "${tabName}"`)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              duplicateSheet: {
                sourceSheetId: templateSheet.properties.sheetId,
                newSheetName: tabName,
                insertSheetIndex: 1, // Insert right after Master sheet
              },
            },
          ],
        },
      })
    } else {
      console.warn(`[sync] Template sheet matching "LASTNAME, FIRST NAME" not found. Falling back to creating a blank tab.`)
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
}

/**
 * Finds the row index (1-based) of a student in the Master sheet by matching Last Name and First Name (both case-insensitive/uppercase).
 * Returns -1 if not found.
 */
async function findMasterRow(
  sheets: ReturnType<typeof getSheetsClient>,
  lastName: string,
  firstName: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MASTER_SHEET_NAME}!A:B`,
  })
  const rows = res.data.values ?? []
  const targetLast = lastName.trim().toUpperCase()
  const targetFirst = firstName.trim().toUpperCase()

  // Skip row 1 (assumed header row)
  for (let i = 1; i < rows.length; i++) {
    const rowLast = (rows[i][0] || '').trim().toUpperCase()
    const rowFirst = (rows[i][1] || '').trim().toUpperCase()
    if (rowLast === targetLast && rowFirst === targetFirst) {
      return i + 1 // 1-based
    }
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
  // ── 0. Environment Guard ──────────────────────────────────
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!spreadsheetId || !clientEmail || !privateKey || privateKey.includes('placeholder')) {
    console.warn('[sync] Missing or placeholder Google Sheets credentials. Skipping sync.')
    return
  }

  try {
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

    const tabName = toSheetTabName(progress.last_name, progress.first_name)

    // ── 3. Update Master Sheet ────────────────────────────────
    // Get all rows to see count and handle empty sheet/target row
    const lastRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MASTER_SHEET_NAME}!A:A`,
    })
    const currentRows = lastRes.data.values ?? []

    // If completely empty, write headers first
    if (currentRows.length === 0) {
      const headers = [
        'LAST NAME',
        'FIRST NAME',
        'SR-CODE',
        'EMAIL',
        'PROGRAM',
        'REQUIRED OJT HOURS',
        'REMAINING HOURS',
        'ESTIMATED COMPLETION',
        'ACTUAL COMPLETION',
        'ASSIGNED PROJECT',
        'GITHUB LINK',
      ]
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!A1:K1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      })
      currentRows.push(['LAST NAME'])
    }

    let rowIndex = await findMasterRow(sheets, progress.last_name, progress.first_name)
    let targetRow = rowIndex
    let existingActualCompletion = ''

    if (rowIndex === -1) {
      // Append a placeholder row first to let Google Sheets find the correct empty row
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!A:K`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            progress.last_name.toUpperCase(),                               // col A: LAST NAME
            progress.first_name.toUpperCase(),                              // col B: FIRST NAME
            progress.sr_code ?? '',                                         // col C: SR-CODE
            progress.email ?? '',                                           // col D: EMAIL
            progress.program.toUpperCase(),                                 // col E: PROGRAM
            progress.required_ojt_hours,                                    // col F: REQUIRED OJT HOURS
            '',                                                             // col G: REMAINING HOURS (formula placeholder)
            formatDate(progress.estimated_completion_date),                 // col H: ESTIMATED COMPLETION
            '',                                                             // col I: ACTUAL COMPLETION
            progress.assigned_project?.toUpperCase() ?? '',                 // col J: ASSIGNED PROJECT
            progress.github_link ?? '',                                     // col K: GITHUB LINK
          ]]
        }
      })

      const updatedRange = appendRes.data.updates?.updatedRange || ''
      const rowMatch = updatedRange.match(/A(\d+):/)
      if (rowMatch) {
        targetRow = parseInt(rowMatch[1], 10)
      } else {
        const lastNumMatch = updatedRange.match(/\d+$/)
        if (lastNumMatch) {
          targetRow = parseInt(lastNumMatch[0], 10)
        } else {
          targetRow = currentRows.length + 1
        }
      }

      // Now insert the correct formula matching the newly generated row number
      const formula = `=F${targetRow}-SUM('${tabName}'!E2:E1000) & " hours"`
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!G${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[formula]] }
      })
    } else {
      // Fetch existing actual completion (column I is index 8)
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!A${rowIndex}:K${rowIndex}`,
      })
      existingActualCompletion = getRes.data.values?.[0]?.[8] || ''

      const masterRow: (string | number)[] = [
        progress.last_name.toUpperCase(),                               // col A: LAST NAME
        progress.first_name.toUpperCase(),                              // col B: FIRST NAME
        progress.sr_code ?? '',                                         // col C: SR-CODE
        progress.email ?? '',                                           // col D: EMAIL
        progress.program.toUpperCase(),                                 // col E: PROGRAM
        progress.required_ojt_hours,                                    // col F: REQUIRED OJT HOURS
        `=F${targetRow}-SUM('${tabName}'!E2:E1000) & " hours"`,          // col G: REMAINING HOURS (formula)
        formatDate(progress.estimated_completion_date),                 // col H: ESTIMATED COMPLETION
        existingActualCompletion,                                       // col I: ACTUAL COMPLETION
        progress.assigned_project?.toUpperCase() ?? '',                 // col J: ASSIGNED PROJECT
        progress.github_link ?? '',                                     // col K: GITHUB LINK
      ]

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!A${targetRow}:K${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [masterRow] },
      })
    }

    // ── 4. Update individual attendance tab ───────────────────
    await ensureSheetTab(sheets, tabName)

    // Header row + data rows
    const headerRow = [
      'DATE',
      'DAY',
      'TIME IN',
      'TIME OUT',
      'NO. OF HOURS',
      'PLANNED TASK / ACTIVITIES',
      'ACTUAL ACCOMPLISHMENT',
    ]

    const attendanceRows: (string | number | null)[][] = (logs ?? []).map(
      (log: AttendanceLog) => [
        formatDate(log.date),
        getDayName(log.date),
        formatTime(log.time_in),
        formatTime(log.time_out),
        log.total_hours != null ? Number(log.total_hours) : '', // raw number for SUM() formula
        log.planned_task ?? '',
        log.actual_accomplishment ?? '',
      ]
    )

    const allRows = [headerRow, ...attendanceRows]

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tabName}'!A1:G${allRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    })

    // Clear any trailing/ghost rows down to 1000 to prevent stale data double-counting
    const startClearRow = allRows.length + 1
    if (startClearRow <= 1000) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tabName}'!A${startClearRow}:G1000`,
      })
    }

    console.log(`[sync] ✅ Synced ${progress.last_name}, ${progress.first_name} to Sheets`)
  } catch (error) {
    console.error(`[sync] ❌ Error syncing student ${studentId} to sheets:`, error)
  }
}

/**
 * Full reconciliation: syncs ALL students to Sheets.
 * Used by the cron job as a fallback.
 */
export async function syncAllStudentsToSheets(): Promise<void> {
  // ── Environment Guard ──────────────────────────────────
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!spreadsheetId || !clientEmail || !privateKey || privateKey.includes('placeholder')) {
    console.warn('[sync] Missing or placeholder Google Sheets credentials. Skipping full sync.')
    return
  }

  try {
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
  } catch (error) {
    console.error('[sync] ❌ Error during full reconciliation:', error)
  }
}
