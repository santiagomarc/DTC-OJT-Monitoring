const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

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

const spreadsheetId = env['GOOGLE_SHEETS_SPREADSHEET_ID']
const clientEmail = env['GOOGLE_SERVICE_ACCOUNT_EMAIL']
const privateKey = env['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY']?.replace(/\\n/g, '\n')

const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
})
const sheets = google.sheets({ version: 'v4', auth })

async function run() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const titles = meta.data.sheets.map(s => s.properties.title)
  console.log('All Sheets:', titles)
}
run().catch(console.error)
