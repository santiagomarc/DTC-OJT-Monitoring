import { NextResponse } from 'next/server'
import { syncAllStudentsToSheets } from '@/lib/sync'

// GET /api/cron
// Full reconciliation — syncs all students to Google Sheets.
// Protected by a secret token sent in the Authorization header.
// Runs every 15 min via Vercel Cron (see vercel.json)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await syncAllStudentsToSheets()
    return NextResponse.json({ ok: true, message: 'Full sync complete' })
  } catch (err) {
    console.error('[cron] Sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
