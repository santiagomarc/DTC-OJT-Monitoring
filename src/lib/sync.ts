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
 * Finds the row index (1-based) of a student in the Master sheet.
 * Searches by Student ID (Column L) first, and falls back to Name matching.
 * Returns -1 if not found.
 */
async function findMasterRow(
  sheets: ReturnType<typeof getSheetsClient>,
  studentId: string,
  lastName: string,
  firstName: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MASTER_SHEET_NAME}!A:L`,
  })
  const rows = res.data.values ?? []
  
  // 1. Search by Student ID (Column L is index 11)
  for (let i = 1; i < rows.length; i++) {
    const rowStudentId = (rows[i][11] || '').trim()
    if (rowStudentId === studentId) {
      return i + 1
    }
  }

  // 2. Fallback to Name matching for manually added rows
  const targetLast = lastName.trim().toUpperCase()
  const targetFirst = firstName.trim().toUpperCase()
  for (let i = 1; i < rows.length; i++) {
    const rowLast = (rows[i][0] || '').trim().toUpperCase()
    const rowFirst = (rows[i][1] || '').trim().toUpperCase()
    if (rowLast === targetLast && rowFirst === targetFirst) {
      return i + 1
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
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()

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
        'STUDENT ID',
      ]
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!A1:L1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      })
      currentRows.push(['LAST NAME'])
    }

    let rowIndex = await findMasterRow(sheets, studentId, progress.last_name, progress.first_name)
    let targetRow = rowIndex
    let existingActualCompletion = ''
    const remainingHoursText = `${progress.remaining_hours} hours`

    if (rowIndex === -1) {
      // Append a placeholder row first to let Google Sheets find the correct empty row
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!A:L`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            progress.last_name.toUpperCase(),                               // col A: LAST NAME
            progress.first_name.toUpperCase(),                              // col B: FIRST NAME
            progress.sr_code ?? '',                                         // col C: SR-CODE
            progress.email ?? '',                                           // col D: EMAIL
            progress.program.toUpperCase(),                                 // col E: PROGRAM
            progress.required_ojt_hours,                                    // col F: REQUIRED OJT HOURS
            remainingHoursText,                                             // col G: REMAINING HOURS (statically computed)
            formatDate(progress.estimated_completion_date),                 // col H: ESTIMATED COMPLETION
            '',                                                             // col I: ACTUAL COMPLETION
            progress.assigned_project?.toUpperCase() ?? '',                 // col J: ASSIGNED PROJECT
            progress.github_link ?? '',                                     // col K: GITHUB LINK
            studentId,                                                      // col L: STUDENT ID
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
    } else {
      // Fetch existing actual completion (column I is index 8)
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!A${rowIndex}:L${rowIndex}`,
      })
      existingActualCompletion = getRes.data.values?.[0]?.[8] || ''

      const masterRow: (string | number)[] = [
        progress.last_name.toUpperCase(),                               // col A: LAST NAME
        progress.first_name.toUpperCase(),                              // col B: FIRST NAME
        progress.sr_code ?? '',                                         // col C: SR-CODE
        progress.email ?? '',                                           // col D: EMAIL
        progress.program.toUpperCase(),                                 // col E: PROGRAM
        progress.required_ojt_hours,                                    // col F: REQUIRED OJT HOURS
        remainingHoursText,                                             // col G: REMAINING HOURS (statically computed)
        formatDate(progress.estimated_completion_date),                 // col H: ESTIMATED COMPLETION
        existingActualCompletion,                                       // col I: ACTUAL COMPLETION
        progress.assigned_project?.toUpperCase() ?? '',                 // col J: ASSIGNED PROJECT
        progress.github_link ?? '',                                     // col K: GITHUB LINK
        studentId,                                                      // col L: STUDENT ID
      ]

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${MASTER_SHEET_NAME}!A${targetRow}:L${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [masterRow] },
      })
    }

    // ── 4. Update individual attendance tab ───────────────────
    await ensureSheetTab(sheets, tabName)

    // Check how many rows already exist in the tab so we can decide
    // whether to write the header (row 1) or skip it to preserve any
    // custom formatting the supervisor has applied there.
    const existingTabRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tabName}'!A1:A1`,
    })
    const tabHasHeader = (existingTabRes.data.values?.length ?? 0) > 0

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

    // If the tab already has a header row, only write data rows (starting at row 2).
    // This preserves any custom formatting (colors, borders, fonts) on row 1.
    if (tabHasHeader && attendanceRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tabName}'!A2:G${attendanceRows.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: attendanceRows },
      })

      // Only clear the TAIL rows beyond what we just wrote.
      // IMPORTANT: Do NOT clear from row 1 — that would destroy header formatting.
      // We start clearing from one row past the last data row.
      const startClearRow = attendanceRows.length + 2 // +1 for header, +1 for next empty
      if (startClearRow <= 1000) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${tabName}'!A${startClearRow}:G1000`,
        })
      }
    } else {
      // Fresh tab — write header + data together
      const allRows = [headerRow, ...attendanceRows]
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tabName}'!A1:G${allRows.length}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allRows },
      })

      // Clear trailing ghost rows (safe here since we wrote the header ourselves)
      const startClearRow = allRows.length + 1
      if (startClearRow <= 1000) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${tabName}'!A${startClearRow}:G1000`,
        })
      }
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
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()

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

    // Process in chunks of 5 parallel requests to prevent API rate limit and timeout issues
    const chunkSize = 5
    for (let i = 0; i < students.length; i += chunkSize) {
      const chunk = students.slice(i, i + chunkSize)
      await Promise.allSettled(chunk.map((student) => syncStudentToSheets(student.id)))
    }

    console.log(`[sync] ✅ Full reconciliation complete — synced ${students.length} students`)
  } catch (error) {
    console.error('[sync] ❌ Error during full reconciliation:', error)
  }
}

/**
 * Deletes a student's individual tab and removes/consolidates their row on the Master tab.
 * Safely recalculates other students' formula offsets during consolidation.
 */
export async function deleteStudentFromSheets(
  studentId: string,
  lastName: string,
  firstName: string
): Promise<void> {
  const spreadsheetId = SPREADSHEET_ID
  const sheets = getSheetsClient()

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetTitles = meta.data.sheets?.map((s) => s.properties?.title || '') || []

    // ── 1. Delete individual sheet tab if exists ──────────────
    const tabName = toSheetTabName(lastName, firstName)
    const normalizedTarget = `${lastName}, ${firstName}`.toUpperCase().replace(/[^A-Z0-9]/g, '')
    let matchedTitle: string | null = null
    let matchedSheetId: number | null = null

    for (const s of meta.data.sheets || []) {
      const title = s.properties?.title || ''
      const normalizedTitle = title.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (normalizedTitle.startsWith(normalizedTarget) || normalizedTarget.startsWith(normalizedTitle)) {
        if (title.toLowerCase() !== 'master' && !title.toUpperCase().includes('TEMPLATE')) {
          matchedTitle = title
          matchedSheetId = s.properties?.sheetId ?? null
          break
        }
      }
    }

    if (matchedTitle && matchedSheetId !== null) {
      console.log(`[sync] Deleting sheet tab: "${matchedTitle}" (sheetId: ${matchedSheetId})`)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: matchedSheetId,
              },
            },
          ],
        },
      })
    }

    // ── 2. Consolidate Master Sheet rows ──────────────────────
    const masterRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${MASTER_SHEET_NAME}!A1:L1000`,
    })
    const rows = masterRes.data.values || []
    
    const targetLast = lastName.trim().toUpperCase()
    const targetFirst = firstName.trim().toUpperCase()

    const cleanRows: string[][] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row && row.some(cell => cell && String(cell).trim() !== '')) {
        const rowStudentId = (row[11] || '').trim()
        const rowLast = (row[0] || '').trim().toUpperCase()
        const rowFirst = (row[1] || '').trim().toUpperCase()
        
        // Skip the student row we are deleting
        if (rowStudentId === studentId || (rowLast === targetLast && rowFirst === targetFirst)) {
          console.log(`[sync] Removing row for studentId=${studentId} (${lastName}, ${firstName}) from Master sheet`)
          continue
        }
        
        // Skip garbage rows
        if (rowLast === '`' || rowLast === '') continue

        cleanRows.push(row)
      }
    }

    const updatedRows = cleanRows.map((row) => {
      const rowLastName = (row[0] || '').trim()
      const rowFirstName = (row[1] || '').trim()

      // Rederive tab name for this row
      const normalizedRowTarget = `${rowLastName}, ${rowFirstName}`.toUpperCase().replace(/[^A-Z0-9]/g, '')
      let rowTabName = toSheetTabName(rowLastName, rowFirstName)
      for (const title of sheetTitles) {
        if (title !== matchedTitle && title.toUpperCase().replace(/[^A-Z0-9]/g, '').startsWith(normalizedRowTarget)) {
          rowTabName = title
          break
        }
      }

      const srCode = row[2] || ''
      const email = row[3] || ''
      const program = row[4] || ''
      const reqHours = row[5] || '486'
      const remainingHours = row[6] || ''
      const estCompletion = row[7] || ''
      const actCompletion = row[8] || ''
      const project = row[9] || ''
      const github = row[10] || ''
      const rowId = row[11] || ''

      return [
        rowLastName.toUpperCase(),
        rowFirstName.toUpperCase(),
        srCode,
        email,
        program.toUpperCase(),
        reqHours,
        remainingHours,
        estCompletion,
        actCompletion,
        project.toUpperCase(),
        github,
        rowId
      ]
    })

    // Write consolidated rows back
    if (updatedRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${MASTER_SHEET_NAME}!A2:L${updatedRows.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: updatedRows },
      })
    }

    // Clear trailing rows
    const startClearRow = updatedRows.length + 2
    if (startClearRow <= 1000) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${MASTER_SHEET_NAME}!A${startClearRow}:L1000`,
      })
    }

    console.log(`[sync] ✅ Successfully cleaned up sheets for ${lastName}, ${firstName}`)
  } catch (error) {
    console.error(`[sync] ❌ Error deleting student ${lastName}, ${firstName} from sheets:`, error)
  }
}

