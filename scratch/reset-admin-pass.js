const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Stub WebSocket globally to prevent initialization error in Node.js < 22 when using @supabase/supabase-js
global.WebSocket = class {}

const envPath = path.join(__dirname, '../.env.local')
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

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
})

async function run() {
  const email = 'coordinator@g.batstate-u.edu.ph'
  const newPassword = 'BatSU-OJT-2026'

  const { data: listUsers, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = listUsers.users.find(u => u.email.toLowerCase() === email.toLowerCase())
  if (!user) {
    console.log(`Admin user ${email} not found. Creating a new one...`)
    // Create new admin
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true
    })
    if (createError) {
      console.error('Error creating user:', createError)
      return
    }
    // Set profile
    await supabase.from('students').insert({
      auth_user_id: newUser.user.id,
      first_name: 'Coordinator',
      last_name: 'DTC',
      program: 'ADMIN',
      required_ojt_hours: 0,
      role: 'admin',
      email
    })
    console.log(`✅ Admin account created successfully!`)
  } else {
    // Reset password
    console.log(`Resetting password for existing admin: ${email}...`)
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    })
    if (updateError) {
      console.error('Error resetting password:', updateError)
      return
    }
    // Double check profile role
    await supabase.from('students').upsert({
      auth_user_id: user.id,
      first_name: 'Coordinator',
      last_name: 'DTC',
      program: 'ADMIN',
      required_ojt_hours: 0,
      role: 'admin',
      email
    }, { onConflict: 'auth_user_id' })

    console.log(`✅ Password successfully reset to "${newPassword}"!`)
  }
}

run().catch(console.error)
