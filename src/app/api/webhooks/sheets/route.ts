import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncStudentToSheets } from '@/lib/sync'

// Helper to clean and convert DATE (MM/DD/YYYY, MM-DD-YY, or YYYY-MM-DD) → YYYY-MM-DD
function parseDate(val: unknown): string | null {
  if (!val) return null
  const str = String(val).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // Match MM-DD-YY, MM/DD/YY, M/D/YYYY, etc.
  const md = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (md) {
    const m = md[1].padStart(2, '0')
    const d = md[2].padStart(2, '0')
    let y = md[3]
    if (y.length === 2) {
      y = '20' + y
    }
    return `${y}-${m}-${d}`
  }

  // Fallback to JS Date parsing
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = (parsed.getMonth() + 1).toString().padStart(2, '0')
    const d = parsed.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return null
}

// Helper to convert time string (e.g. "8:00 AM", "17:30", "5:00 PM") → HH:MM:00
function parseTime(val: unknown): string | null {
  if (!val) return null
  const str = String(val).trim().toUpperCase()

  // Match HH:MM or HH:MM:SS (24-hour)
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (match24) {
    const h = match24[1].padStart(2, '0')
    const m = match24[2]
    return `${h}:${m}:00`
  }

  // Match H:MM AM/PM or H:MM:SS AM/PM
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/)
  if (match12) {
    let h = parseInt(match12[1], 10)
    const m = match12[2]
    const ampm = match12[3]
    if (ampm === 'PM' && h < 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${h.toString().padStart(2, '0')}:${m}:00`
  }

  return null
}

/**
 * Derives a BatSU school email from SR-Code or full name.
 * Used when auto-provisioning an account for a student who is
 * in the Sheet's Master tab but not yet in Supabase.
 */
function deriveEmail(srCode: string | null, firstName: string, lastName: string): string {
  if (srCode) {
    return `${srCode}@g.batstate-u.edu.ph`
  }
  const sanitized = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}`
  return `${sanitized}@g.batstate-u.edu.ph`
}

interface SheetEdit {
  row: number
  rowData: unknown[]
}

interface WebhookPayload {
  secret: string
  sheetName: string
  edits: SheetEdit[]
}

export async function POST(request: Request) {
  try {
    const body: WebhookPayload = await request.json()
    const { secret, sheetName, edits } = body

    // 1. Verify Secret Token
    const expectedSecret = process.env.SHEETS_WEBHOOK_SECRET || 'bat-su-ojt-secret-key-2026'
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!sheetName || !edits || !Array.isArray(edits)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const results: string[] = []

    const isMasterSheet = sheetName.toLowerCase().includes('master')

    for (const edit of edits) {
      const { row, rowData } = edit
      if (!rowData || (rowData as unknown[]).length === 0) continue

      if (isMasterSheet) {
        // ── MASTER SHEET UPDATE ─────────────────────────────────────
        // Columns A to K:
        // A: Last Name, B: First Name, C: SR-Code, D: Email, E: Program
        // F: Req Hours, G: Rem Hours (formula), H: Est Date, I: Act Date, J: Proj, K: Github
        const rd = rowData as unknown[]
        const lastName = String(rd[0] || '').trim()
        const firstName = String(rd[1] || '').trim()
        const srCode = String(rd[2] || '').trim() || null
        const email = String(rd[3] || '').trim() || null
        const program = String(rd[4] || '').trim()
        const requiredHours = Number(rd[5]) || 486
        const assignedProject = String(rd[9] || '').trim() || null
        const githubLink = String(rd[10] || '').trim() || null

        if (!lastName || !firstName) {
          results.push(`Row ${row}: Skipped (missing last or first name)`)
          continue
        }

        // Find existing student: SR-Code → Email → Name (in priority order)
        let student = null
        if (srCode) {
          const { data } = await supabase.from('students').select('*').eq('sr_code', srCode).maybeSingle()
          student = data
        }
        if (!student && email) {
          const { data } = await supabase.from('students').select('*').eq('email', email).maybeSingle()
          student = data
        }
        if (!student) {
          const { data } = await supabase.from('students').select('*')
            .ilike('last_name', lastName)
            .ilike('first_name', firstName)
            .maybeSingle()
          student = data
        }

        if (!student) {
          // ── AUTO-PROVISION ──────────────────────────────────────────
          // A supervisor added a new intern row to the Master sheet.
          // Create a Supabase auth account + student profile automatically.
          const derivedEmail = email || deriveEmail(srCode, firstName, lastName)
          const defaultPassword = srCode ? `OJT-${srCode}` : 'BatSU-OJT-2026'

          // Check if an auth user with this email already exists
          const { data: listData } = await supabase.auth.admin.listUsers()
          const existingAuth = listData?.users?.find(
            (u) => u.email?.toLowerCase() === derivedEmail.toLowerCase()
          )

          let authUserId: string

          if (existingAuth) {
            authUserId = existingAuth.id
            results.push(`Row ${row}: Found existing auth user for ${derivedEmail}`)
          } else {
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: derivedEmail,
              password: defaultPassword,
              email_confirm: true,
            })

            if (authError || !authData?.user) {
              results.push(`Row ${row}: ❌ Failed to create auth account for ${derivedEmail}: ${authError?.message}`)
              continue
            }
            authUserId = authData.user.id
            // Log the generated credentials so the admin can share them
            console.log(`[webhook] 🔑 Auto-provisioned: ${derivedEmail} / ${defaultPassword}`)
            results.push(`Row ${row}: ✅ Created account: ${derivedEmail} (password: ${defaultPassword})`)
          }

          const { data: newStudent, error: profileError } = await supabase
            .from('students')
            .insert({
              auth_user_id: authUserId,
              first_name: firstName,
              last_name: lastName,
              sr_code: srCode,
              email: derivedEmail,
              program: program || 'BSIT',
              required_ojt_hours: requiredHours,
              assigned_project: assignedProject,
              github_link: githubLink,
              role: 'student',
            })
            .select()
            .single()

          if (profileError || !newStudent) {
            results.push(`Row ${row}: ❌ Failed to create student profile: ${profileError?.message}`)
            continue
          }

          results.push(`Row ${row}: ✅ Auto-provisioned student ${lastName}, ${firstName}`)

          // Write-back: push normalized data from DB → Sheet
          syncStudentToSheets(newStudent.id).catch((e) =>
            console.error(`[webhook] Write-back sync failed for new student ${newStudent.id}:`, e)
          )
          continue
        }

        // Student found — update editable profile fields
        const { error: updateError } = await supabase
          .from('students')
          .update({
            last_name: lastName,
            first_name: firstName,
            sr_code: srCode,
            email: email || student.email,
            program: program || student.program,
            required_ojt_hours: requiredHours,
            assigned_project: assignedProject,
            github_link: githubLink,
          })
          .eq('id', student.id)

        if (updateError) {
          results.push(`Row ${row}: ❌ Error updating student: ${updateError.message}`)
        } else {
          results.push(`Row ${row}: ✅ Updated student ${lastName}, ${firstName}`)

          // Write-back: re-sync normalized DB data → Sheet.
          // Apps Script installedOnEdit does NOT fire on Sheets API writes,
          // so there is no infinite loop risk here.
          syncStudentToSheets(student.id).catch((e) =>
            console.error(`[webhook] Write-back sync failed for ${student.id}:`, e)
          )
        }

      } else {
        // ── INDIVIDUAL STUDENT SHEET UPDATE ──────────────────────────
        // Sheet tab name format: "LAST NAME, FIRST NAME"
        const parts = sheetName.split(',')
        const lastName = parts[0]?.trim()
        const firstName = parts[1]?.trim()

        if (!lastName) {
          results.push(`Sheet ${sheetName}: Invalid individual sheet tab name`)
          continue
        }

        // Find student by name
        const { data: student } = await supabase.from('students').select('id')
          .ilike('last_name', lastName)
          .ilike('first_name', firstName || '')
          .maybeSingle()

        if (!student) {
          results.push(`Sheet ${sheetName}: Student not found in DB`)
          continue
        }

        // Individual sheet columns:
        // A: Date, B: Day, C: Time In, D: Time Out, E: Hours (computed), F: Planned Task, G: Accomplishment
        const rd = rowData as unknown[]
        const rawDate = rd[0]
        const date = parseDate(rawDate)

        if (!date) {
          results.push(`Sheet ${sheetName} Row ${row}: Skipped (invalid date: ${rawDate})`)
          continue
        }

        const timeIn = parseTime(rd[2])
        const timeOut = parseTime(rd[3])
        const plannedTask = String(rd[5] || '').trim() || null
        const actualAccomplishment = String(rd[6] || '').trim() || null

        // If Time In is blank → treat as a delete for this date
        if (!timeIn) {
          const { error: deleteError } = await supabase
            .from('attendance_logs')
            .delete()
            .eq('student_id', student.id)
            .eq('date', date)

          if (deleteError) {
            results.push(`Sheet ${sheetName} Row ${row}: ❌ Error deleting log: ${deleteError.message}`)
          } else {
            results.push(`Sheet ${sheetName} Row ${row}: 🗑 Deleted attendance log for ${date}`)

            // Write-back after delete so Sheet reflects the DB state
            syncStudentToSheets(student.id).catch((e) =>
              console.error(`[webhook] Write-back sync failed for ${student.id}:`, e)
            )
          }
        } else {
          // Upsert attendance log
          const { error: upsertError } = await supabase
            .from('attendance_logs')
            .upsert({
              student_id: student.id,
              date,
              time_in: timeIn,
              time_out: timeOut || null,
              planned_task: plannedTask,
              actual_accomplishment: actualAccomplishment,
            }, {
              onConflict: 'student_id,date',
            })

          if (upsertError) {
            results.push(`Sheet ${sheetName} Row ${row}: ❌ Error upserting log: ${upsertError.message}`)
          } else {
            results.push(`Sheet ${sheetName} Row ${row}: ✅ Upserted log for ${date}`)

            // Write-back: push normalized data back to Sheet.
            // onEdit Apps Script does NOT fire for API writes → no loop.
            syncStudentToSheets(student.id).catch((e) =>
              console.error(`[webhook] Write-back sync failed for ${student.id}:`, e)
            )
          }
        }
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error'
    console.error('[webhook] Sheets webhook error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
