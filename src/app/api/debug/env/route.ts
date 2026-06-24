import { NextResponse } from 'next/server'

/**
 * GET /api/debug/env
 * Diagnostic endpoint to check if Google Sheets env vars are loaded correctly.
 * Returns redacted info — never exposes full secrets.
 * DELETE THIS FILE AFTER DEBUGGING.
 */
export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
  const webhookSecret = process.env.SHEETS_WEBHOOK_SECRET || ''

  // Check for common issues with the private key
  const keyIssues: string[] = []

  if (!rawKey) {
    keyIssues.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is empty/not set')
  } else {
    if (rawKey.startsWith('"') || rawKey.startsWith("'")) {
      keyIssues.push('Key starts with a quote character — remove surrounding quotes')
    }
    if (rawKey.endsWith('"') || rawKey.endsWith("'")) {
      keyIssues.push('Key ends with a quote character — remove surrounding quotes')
    }
    if (!rawKey.includes('BEGIN') && !rawKey.includes('PRIVATE KEY')) {
      keyIssues.push('Key does not contain "BEGIN PRIVATE KEY" header')
    }
    if (rawKey.includes('BEGIN RSA PRIVATE KEY')) {
      keyIssues.push('Key uses RSA format (BEGIN RSA PRIVATE KEY). Google service accounts use PKCS8 format (BEGIN PRIVATE KEY).')
    }

    // Check if the key has proper newlines or escaped newlines
    const hasRealNewlines = rawKey.includes('\n') && !rawKey.includes('\\n')
    const hasEscapedNewlines = rawKey.includes('\\n')
    if (!hasRealNewlines && !hasEscapedNewlines) {
      keyIssues.push('Key has no newline characters (neither real nor escaped \\n)')
    }

    // After applying the same transform the app uses:
    const processed = rawKey.replace(/\\n/g, '\n')
    if (!processed.includes('-----BEGIN PRIVATE KEY-----')) {
      keyIssues.push('After processing, key still missing "-----BEGIN PRIVATE KEY-----" header')
    }
    if (!processed.includes('-----END PRIVATE KEY-----')) {
      keyIssues.push('After processing, key still missing "-----END PRIVATE KEY-----" footer')
    }
  }

  return NextResponse.json({
    email: email || '(not set)',
    emailLength: email.length,
    emailHasQuotes: email.startsWith('"') || email.endsWith('"'),
    emailHasSpaces: email !== email.trim(),
    spreadsheetId: spreadsheetId ? `${spreadsheetId.substring(0, 6)}...${spreadsheetId.substring(spreadsheetId.length - 4)}` : '(not set)',
    webhookSecret: webhookSecret ? `${webhookSecret.substring(0, 6)}...` : '(not set — using fallback)',
    privateKey: {
      length: rawKey.length,
      first20: rawKey.substring(0, 20),
      last20: rawKey.substring(rawKey.length - 20),
      hasBeginMarker: rawKey.includes('BEGIN'),
      hasEndMarker: rawKey.includes('END'),
      hasEscapedNewlines: rawKey.includes('\\n'),
      hasRealNewlines: rawKey.includes('\n') && !rawKey.includes('\\n'),
      startsWithQuote: rawKey.startsWith('"') || rawKey.startsWith("'"),
      endsWithQuote: rawKey.endsWith('"') || rawKey.endsWith("'"),
      issues: keyIssues,
    },
  })
}
