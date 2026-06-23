import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Helper to clean and convert DATE (MM/DD/YYYY, MM-DD-YY, or YYYY-MM-DD) → YYYY-MM-DD
function parseDate(val: any): string | null {
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
function parseTime(val: any): string | null {
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

interface SheetEdit {
  row: number
  rowData: any[]
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
      if (!rowData || rowData.length === 0) continue

      if (isMasterSheet) {
        // ── MASTER SHEET UPDATE ─────────────────────────────────────
        // Columns A to K:
        // A: Last Name, B: First Name, C: SR-Code, D: Email, E: Program, F: Req Hours, G: Rem Hours, H: Est Date, I: Act Date, J: Proj, K: Github
        const lastName = String(rowData[0] || '').trim()
        const firstName = String(rowData[1] || '').trim()
        const srCode = String(rowData[2] || '').trim()
        const email = String(rowData[3] || '').trim()
        const program = String(rowData[4] || '').trim()
        const requiredHours = Number(rowData[5]) || 486
        const assignedProject = String(rowData[9] || '').trim()
        const githubLink = String(rowData[10] || '').trim()

        if (!lastName || !firstName) {
          results.push(`Row ${row}: Skipped (missing last or first name)`)
          continue
        }

        // Find existing student by SR-Code, Email, or Name
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
          results.push(`Row ${row}: Student not found in DB for ${lastName}, ${firstName}`)
          continue
        }

        // Update student fields
        const { error: updateError } = await supabase
          .from('students')
          .update({
            last_name: lastName,
            first_name: firstName,
            sr_code: srCode || null,
            email: email || null,
            program: program || student.program,
            required_ojt_hours: requiredHours,
            assigned_project: assignedProject || null,
            github_link: githubLink || null,
          })
          .eq('id', student.id)

        if (updateError) {
          results.push(`Row ${row}: Error updating student: ${updateError.message}`)
        } else {
          results.push(`Row ${row}: Updated student ${lastName}, ${firstName}`)
        }

      } else {
        // ── INDIVIDUAL STUDENT SHEET UPDATE ──────────────────────────
        // Sheet name format: "LAST NAME, FIRST NAME" (or fuzzy version of it)
        const parts = sheetName.split(',')
        const lastName = parts[0]?.trim()
        const firstName = parts[1]?.trim()

        if (!lastName) {
          results.push(`Sheet ${sheetName}: Invalid individual sheet tab name`)
          continue
        }

        // Find student
        const { data: student } = await supabase.from('students').select('id')
          .ilike('last_name', lastName)
          .ilike('first_name', firstName || '')
          .maybeSingle()

        if (!student) {
          results.push(`Sheet ${sheetName}: Student not found in DB`)
          continue
        }

        // Individual sheet columns:
        // A: Date, B: Day, C: Time In, D: Time Out, E: Hours, F: Planned Task, G: Accomplishment
        const rawDate = rowData[0]
        const date = parseDate(rawDate)

        if (!date) {
          results.push(`Sheet ${sheetName} Row ${row}: Skipped (invalid date: ${rawDate})`)
          continue
        }

        const timeIn = parseTime(rowData[2])
        const timeOut = parseTime(rowData[3])
        const plannedTask = String(rowData[5] || '').trim()
        const actualAccomplishment = String(rowData[6] || '').trim()

        // If Time In is cleared/empty, we delete the attendance log for this date
        if (!timeIn) {
          const { error: deleteError } = await supabase
            .from('attendance_logs')
            .delete()
            .eq('student_id', student.id)
            .eq('date', date)

          if (deleteError) {
            results.push(`Sheet ${sheetName} Row ${row}: Error deleting log: ${deleteError.message}`)
          } else {
            results.push(`Sheet ${sheetName} Row ${row}: Deleted attendance log for ${date}`)
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
              planned_task: plannedTask || null,
              actual_accomplishment: actualAccomplishment || null,
            }, {
              onConflict: 'student_id,date'
            })

          if (upsertError) {
            results.push(`Sheet ${sheetName} Row ${row}: Error upserting log: ${upsertError.message}`)
          } else {
            results.push(`Sheet ${sheetName} Row ${row}: Upserted log for ${date}`)
          }
        }
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('[webhook] Sheets webhook error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
