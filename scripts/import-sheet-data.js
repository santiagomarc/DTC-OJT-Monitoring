const { createClient } = require('@supabase/supabase-js')
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

// ── 1. LOAD ENV VARIABLES ────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found at:', envPath)
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] ? match[2].trim() : ''
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1)
    }
    env[match[1]] = value
  }
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']
const spreadsheetId = env['GOOGLE_SHEETS_SPREADSHEET_ID']
const clientEmail = env['GOOGLE_SERVICE_ACCOUNT_EMAIL']
const privateKey = env['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY']?.replace(/\\n/g, '\n')

if (!supabaseUrl || !supabaseServiceRoleKey || !spreadsheetId || !clientEmail || !privateKey) {
  console.error('❌ Missing required environment variables in .env.local')
  console.error({
    supabaseUrl: !!supabaseUrl,
    supabaseServiceRoleKey: !!supabaseServiceRoleKey,
    spreadsheetId: !!spreadsheetId,
    clientEmail: !!clientEmail,
    privateKey: !!privateKey
  })
  process.exit(1)
}

// ── 2. INITIALIZE CLIENTS ────────────────────────────────────
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
})

const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
})
const sheets = google.sheets({ version: 'v4', auth })

// Helper to clean and convert DATE (MM/DD/YYYY or YYYY-MM-DD) → YYYY-MM-DD
function parseDate(val) {
  if (!val) return null
  const str = val.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // Match MM/DD/YYYY or M/D/YYYY
  const md = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (md) {
    const m = md[1].padStart(2, '0')
    const d = md[2].padStart(2, '0')
    const y = md[3]
    return `${y}-${m}-${d}`
  }
  return null
}

// Helper to convert time string (e.g. "8:00 AM", "17:30", "5:00 PM") → HH:MM:00
function parseTime(val) {
  if (!val) return null
  const str = val.trim().toUpperCase()

  // Match HH:MM
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (match24) {
    const h = match24[1].padStart(2, '0')
    const m = match24[2]
    return `${h}:${m}:00`
  }

  // Match H:MM AM/PM
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)
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

// ── 3. MAIN RUNNER ───────────────────────────────────────────
async function run() {
  console.log('🚀 Starting Google Sheet import migration...')
  console.log('Spreadsheet ID:', spreadsheetId)

  try {
    // 1. Fetch metadata and sheets to locate the Master tab
    const meta = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetTitles = meta.data.sheets.map(s => s.properties.title)
    console.log('Found sheets:', sheetTitles)

    const masterName = sheetTitles.find(t => t.toLowerCase() === 'master')
    if (!masterName) {
      console.error('❌ Could not find a sheet tab named "Master" (case-insensitive)')
      process.exit(1)
    }

    // 2. Fetch Master sheet data
    const masterDataRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${masterName}!A1:Z500`
    })

    const masterRows = masterDataRes.data.values || []
    if (masterRows.length < 2) {
      console.log('⚠️ Master sheet has no data rows to import.')
      process.exit(0)
    }

    const headers = masterRows[0].map(h => h.trim().toLowerCase())
    console.log('Master sheet headers:', masterRows[0])

    // Detect column indexes dynamically
    const colIdx = {
      lastName: headers.findIndex(h => h.includes('last')),
      firstName: headers.findIndex(h => h.includes('first')),
      srCode: headers.findIndex(h => h.includes('sr') || h.includes('code')),
      email: headers.findIndex(h => h.includes('email') || h.includes('mail')),
      program: headers.findIndex(h => h.includes('program') || h.includes('course')),
      hours: headers.findIndex(h => h.includes('required') || h.includes('hours')),
      project: headers.findIndex(h => h.includes('project') || h.includes('assign')),
      github: headers.findIndex(h => h.includes('github') || h.includes('git'))
    }

    console.log('Detected column indexes:', colIdx)

    if (colIdx.lastName === -1 || colIdx.firstName === -1) {
      console.error('❌ Could not find Last Name or First Name columns in headers.')
      process.exit(1)
    }

    const studentsToImport = []

    for (let i = 1; i < masterRows.length; i++) {
      const row = masterRows[i]
      if (!row || row.length === 0) continue

      const lastName = row[colIdx.lastName]?.trim()
      const firstName = row[colIdx.firstName]?.trim()
      if (!lastName || !firstName) continue

      const srCode = colIdx.srCode !== -1 ? row[colIdx.srCode]?.trim() : null
      const email = colIdx.email !== -1 ? row[colIdx.email]?.trim() : null
      const program = colIdx.program !== -1 ? row[colIdx.program]?.trim() : 'BSIT'
      const reqHours = colIdx.hours !== -1 ? parseFloat(row[colIdx.hours]) || 486 : 486
      const project = colIdx.project !== -1 ? row[colIdx.project]?.trim() : null
      const github = colIdx.github !== -1 ? row[colIdx.github]?.trim() : null

      studentsToImport.push({
        lastName,
        firstName,
        srCode,
        email,
        program,
        reqHours,
        project,
        github,
        rowIndex: i + 1
      })
    }

    console.log(`\n📋 Found ${studentsToImport.length} students to import from Master sheet.`)

    for (const student of studentsToImport) {
      console.log(`\n--- Importing Intern: ${student.lastName}, ${student.firstName} ---`)

      // Check if student profile already exists in Supabase
      let { data: existingStudent } = await supabase
        .from('students')
        .select('*')
        .eq('last_name', student.lastName)
        .eq('first_name', student.firstName)
        .maybeSingle()

      let studentId = existingStudent?.id
      let authUserId = existingStudent?.auth_user_id

      if (!existingStudent) {
        // We need an email to create an Auth account.
        // If the sheet doesn't specify an email, generate a school email format: <sr-code>@g.batstate-u.edu.ph or a default.
        let studentEmail = student.email
        if (!studentEmail) {
          if (student.srCode) {
            studentEmail = `${student.srCode}@g.batstate-u.edu.ph`
          } else {
            const sanitizedName = `${student.firstName.toLowerCase().replace(/\s+/g, '')}.${student.lastName.toLowerCase().replace(/\s+/g, '')}`
            studentEmail = `${sanitizedName}@g.batstate-u.edu.ph`
          }
        }

        // Check if a user with this email already exists
        const { data: listUsers } = await supabase.auth.admin.listUsers()
        const existingAuth = listUsers?.users?.find(u => u.email.toLowerCase() === studentEmail.toLowerCase())

        if (existingAuth) {
          authUserId = existingAuth.id
          console.log(`Found existing auth user for ${studentEmail}`)
        } else {
          // Create Supabase Auth User
          const defaultPassword = student.srCode ? `OJT-${student.srCode}` : 'BatSU-OJT-2026'
          console.log(`Creating Auth Account: ${studentEmail} (Password: ${defaultPassword})`)

          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password: defaultPassword,
            email_confirm: true
          })

          if (authError) {
            console.error(`❌ Error creating auth account for ${studentEmail}:`, authError.message)
            continue
          }
          authUserId = authData.user.id
        }

        // Create student profile
        console.log(`Creating student profile in database...`)
        const { data: newStudent, error: profileError } = await supabase
          .from('students')
          .insert({
            auth_user_id: authUserId,
            first_name: student.firstName,
            last_name: student.lastName,
            sr_code: student.srCode,
            email: studentEmail,
            program: student.program,
            required_ojt_hours: student.reqHours,
            assigned_project: student.project,
            github_link: student.github,
            role: 'student'
          })
          .select()
          .single()

        if (profileError) {
          console.error(`❌ Error creating student profile:`, profileError.message)
          continue
        }
        studentId = newStudent.id
        console.log(`✅ Created student profile: ${newStudent.id}`)
      } else {
        console.log(`ℹ️ Student profile already exists in DB: ${studentId}`)
      }

      // ── Import Attendance Logs ──────────────────────────────────
      // Search for the matching tab title in the spreadsheet
      const expectedTabNames = [
        `${student.lastName}, ${student.firstName}`.toUpperCase(),
        `${student.lastName}, ${student.firstName}`,
        `${student.firstName} ${student.lastName}`
      ]

      let matchedTabName = null
      for (const title of sheetTitles) {
        if (expectedTabNames.includes(title.toUpperCase()) || expectedTabNames.includes(title)) {
          matchedTabName = title
          break
        }
      }

      if (!matchedTabName) {
        console.log(`⚠️ No individual sheet tab found matching "${student.lastName}, ${student.firstName}". Skipping logs import.`)
        continue
      }

      console.log(`Reading attendance logs from tab: "${matchedTabName}"`)
      const tabDataRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${matchedTabName}'!A1:G500`
      })

      const tabRows = tabDataRes.data.values || []
      if (tabRows.length < 2) {
        console.log(`ℹ️ Attendance tab "${matchedTabName}" has no data rows.`)
        continue
      }

      const logHeaders = tabRows[0].map(h => h.trim().toLowerCase())
      const logIdx = {
        date: logHeaders.findIndex(h => h.includes('date')),
        timeIn: logHeaders.findIndex(h => h.includes('in')),
        timeOut: logHeaders.findIndex(h => h.includes('out')),
        planned: logHeaders.findIndex(h => h.includes('plan')),
        actual: logHeaders.findIndex(h => h.includes('actual') || h.includes('accomplish'))
      }

      if (logIdx.date === -1 || logIdx.timeIn === -1) {
        console.log(`⚠️ Tab "${matchedTabName}" does not have clear Date and Time In columns. Skipping logs.`)
        continue
      }

      let insertedCount = 0
      for (let j = 1; j < tabRows.length; j++) {
        const row = tabRows[j]
        if (!row || row.length === 0) continue

        const rawDate = row[logIdx.date]
        const rawTimeIn = row[logIdx.timeIn]
        const rawTimeOut = logIdx.timeOut !== -1 ? row[logIdx.timeOut] : null
        const planned = logIdx.planned !== -1 ? row[logIdx.planned] : null
        const actual = logIdx.actual !== -1 ? row[logIdx.actual] : null

        const date = parseDate(rawDate)
        const timeIn = parseTime(rawTimeIn)
        const timeOut = parseTime(rawTimeOut)

        if (!date || !timeIn) continue

        // Check if log already exists for this date and student
        const { data: existingLog } = await supabase
          .from('attendance_logs')
          .select('id')
          .eq('student_id', studentId)
          .eq('date', date)
          .maybeSingle()

        if (!existingLog) {
          const { error: insertError } = await supabase
            .from('attendance_logs')
            .insert({
              student_id: studentId,
              date,
              time_in: timeIn,
              time_out: timeOut,
              planned_task: planned || '',
              actual_accomplishment: actual || ''
            })

          if (insertError) {
            console.error(`  ❌ Error inserting log for ${date}:`, insertError.message)
          } else {
            insertedCount++
          }
        }
      }

      console.log(`✅ Synced ${insertedCount} attendance logs to DB for ${student.lastName}`)
    }

    console.log('\n🏁 Google Sheets data import complete!')
  } catch (error) {
    console.error('❌ General migration failure:', error)
  }
}

run()
