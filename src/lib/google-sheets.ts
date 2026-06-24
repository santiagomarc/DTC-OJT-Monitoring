import { google } from 'googleapis'

/**
 * Returns an authenticated Google Sheets client using a Service Account.
 * Credentials are loaded from environment variables — never from a file.
 */
export function getSheetsClient() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
  const privateKey = rawKey?.replace(/\\n/g, '\n')
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()!
export const MASTER_SHEET_NAME = 'Master'

