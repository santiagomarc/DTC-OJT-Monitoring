const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Stub WebSocket globally to prevent initialization error in Node.js < 22 when using @supabase/supabase-js
global.WebSocket = class {}

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

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required Supabase environment variables in .env.local')
  process.exit(1)
}

// ── 2. INITIALIZE SERVICE ROLE CLIENT ────────────────────────
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
})

// ── 3. CREATE ADMIN ──────────────────────────────────────────
async function run() {
  const email = process.argv[2]
  const password = process.argv[3]
  const firstName = process.argv[4] || 'Admin'
  const lastName = process.argv[5] || 'User'

  if (!email || !password) {
    console.error('❌ Usage: node scripts/create-admin.js <email> <password> [first_name] [last_name]')
    console.error('Example: node scripts/create-admin.js coordinator@g.batstate-u.edu.ph AdminPass123 Jane Smith')
    process.exit(1)
  }

  console.log(`🚀 Attempting to create or promote admin account for: ${email}...`)

  try {
    // Check if user already exists in auth.users by listing users
    const { data: listUsers, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('❌ Error listing auth users:', listError.message)
      process.exit(1)
    }

    const existingAuth = listUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    let authUserId = existingAuth?.id

    if (existingAuth) {
      console.log(`ℹ️ Auth user already exists with ID: ${authUserId}. Promoting to admin...`)
    } else {
      // Create a new auth user
      console.log(`Creating new Auth user...`)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authError) {
        console.error('❌ Error creating auth user:', authError.message)
        process.exit(1)
      }

      authUserId = authData.user.id
      console.log(`✅ Auth user created successfully with ID: ${authUserId}`)
    }

    // Now, insert or update the profile in the public.students table with role = 'admin'
    const { data: existingProfile } = await supabase
      .from('students')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (existingProfile) {
      console.log(`Updating existing profile to admin role...`)
      const { error: updateError } = await supabase
        .from('students')
        .update({
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          email
        })
        .eq('auth_user_id', authUserId)

      if (updateError) {
        console.error('❌ Error updating student profile to admin:', updateError.message)
        process.exit(1)
      }
      console.log(`✅ Successfully updated student profile to admin!`)
    } else {
      console.log(`Inserting new admin profile...`)
      const { error: insertError } = await supabase
        .from('students')
        .insert({
          auth_user_id: authUserId,
          first_name: firstName,
          last_name: lastName,
          program: 'ADMIN',
          required_ojt_hours: 0,
          role: 'admin',
          email
        })

      if (insertError) {
        console.error('❌ Error inserting admin profile:', insertError.message)
        process.exit(1)
      }
      console.log(`✅ Successfully inserted admin profile into database!`)
    }

    console.log(`🎉 Process complete! Admin credentials:`)
    console.log(`   Email:    ${email}`)
    console.log(`   Password: ${password}`)

  } catch (error) {
    console.error('❌ Unexpected failure:', error)
  }
}

run()
