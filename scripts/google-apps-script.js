// =========================================================================
// GOOGLE APPS SCRIPT FOR BATSU OJT MONITORING SYSTEM
// =========================================================================
//
// HOW TO DEPLOY THIS SCRIPT:
//
// 1. Open your Google Sheet.
// 2. Click Extensions → Apps Script.
// 3. Delete any existing code and paste this entire script.
// 4. Update WEBHOOK_URL below:
//      • LOCAL DEV:  Use your ngrok URL: https://xxxx.ngrok-free.app/api/webhooks/sheets
//      • PRODUCTION: Use your Vercel URL: https://your-app.vercel.app/api/webhooks/sheets
// 5. Save the project (Ctrl+S or the floppy disk icon).
// 6. Click the Clock icon (Triggers) on the left sidebar.
// 7. Click "+ Add Trigger" in the bottom-right corner.
// 8. Configure the trigger:
//      - Function to run:           installedOnEdit
//      - Event source:              From spreadsheet
//      - Event type:                On edit
//      - Failure notification:      Notify me daily (recommended)
// 9. Click Save. It will ask for permissions — authorize with your Google Account.
//
// NOTE: This MUST be an "installable trigger" (added via the Triggers UI).
//       The simple `onEdit` function will NOT work for UrlFetchApp calls.
//
// WHY THERE IS NO INFINITE LOOP:
//   Google Apps Script's installable onEdit trigger only fires when a HUMAN
//   edits the sheet in the browser. It does NOT fire when the Sheets API
//   (used by the web app's service account) writes to the sheet.
//   So: Sheet edit → webhook → DB → syncToSheets → Sheet API write → (no trigger fired).
//
// =========================================================================

// ── CONFIGURATION ─────────────────────────────────────────────────────────
var WEBHOOK_URL = 'https://dtc-ojt-monitoring.vercel.app/api/webhooks/sheets'
//                 ↑ Replace with your actual deployed URL before installing the trigger.
//                   For local dev with ngrok: 'https://xxxx.ngrok-free.app/api/webhooks/sheets'

var SECRET = 'bat-su-ojt-secret-key-2026'
//            ↑ Must match SHEETS_WEBHOOK_SECRET in your .env.local / Vercel env vars.
// ── END CONFIGURATION ──────────────────────────────────────────────────────

/**
 * Installable onEdit trigger.
 * Fires only on MANUAL user edits — NOT on Sheets API writes.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function installedOnEdit(e) {
  if (!e) return

  var sheet = e.range.getSheet()
  var sheetName = sheet.getName()

  // Ignore the template tab and any tab whose name looks like a placeholder
  var lowerName = sheetName.toLowerCase()
  if (
    lowerName.indexOf('template') !== -1 ||
    lowerName.indexOf('lastname') !== -1 ||
    lowerName.indexOf('copy of') !== -1
  ) {
    return
  }

  var startRow = e.range.getRow()
  var numRows = e.range.getNumRows()
  var edits = []

  for (var i = 0; i < numRows; i++) {
    var currentRow = startRow + i
    if (currentRow === 1) continue // Skip the header row

    var isMaster = lowerName.indexOf('master') !== -1
    var lastCol = isMaster ? 11 : 7 // Master: A-K (11 cols), Individual: A-G (7 cols)

    var rowRange = sheet.getRange(currentRow, 1, 1, lastCol)
    var rowData = rowRange.getValues()[0]

    // Convert any Google Sheets Date objects → YYYY-MM-DD string
    // (Sheets returns Date objects for cells formatted as dates)
    for (var colIdx = 0; colIdx < rowData.length; colIdx++) {
      var val = rowData[colIdx]
      if (val instanceof Date) {
        var yyyy = val.getFullYear()
        var mm = ('0' + (val.getMonth() + 1)).slice(-2)
        var dd = ('0' + val.getDate()).slice(-2)
        rowData[colIdx] = yyyy + '-' + mm + '-' + dd
      }
    }

    edits.push({
      row: currentRow,
      rowData: rowData,
    })
  }

  if (edits.length === 0) return

  var payload = {
    secret: SECRET,
    sheetName: sheetName,
    edits: edits,
  }

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // Prevents script from crashing on HTTP errors
  }

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    var responseCode = response.getResponseCode()
    var responseText = response.getContentText()

    if (responseCode === 200) {
      Logger.log('[OJT Sync] ✅ Webhook OK: ' + responseText)
    } else {
      Logger.log('[OJT Sync] ⚠️ Webhook returned ' + responseCode + ': ' + responseText)
    }
  } catch (err) {
    Logger.log('[OJT Sync] ❌ Webhook error: ' + err.toString())
  }
}

/**
 * Helper: run this function manually from the Apps Script editor to
 * verify your WEBHOOK_URL and SECRET are correct before setting up
 * the real trigger.
 *
 * How to use:
 *  1. Select "testWebhook" from the function dropdown at the top.
 *  2. Click the ▶ Run button.
 *  3. Check the Execution log for the result.
 */
function testWebhook() {
  var payload = {
    secret: SECRET,
    sheetName: 'Master',
    edits: [
      {
        row: 999, // A row number that won't match any real data
        rowData: ['TEST', 'PING', '', '', '', 486, '', '', '', '', ''],
      },
    ],
  }

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  }

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    Logger.log('Status: ' + response.getResponseCode())
    Logger.log('Body:   ' + response.getContentText())
  } catch (err) {
    Logger.log('Error:  ' + err.toString())
  }
}
