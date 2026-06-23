// =========================================================================
// GOOGLE APPS SCRIPT FOR BATSU OJT MONITORING SYSTEM
// =========================================================================
// INSTRUCTIONS:
// 1. In your Google Sheet, click Extensions -> Apps Script.
// 2. Delete any existing code and paste this script.
// 3. Update the WEBHOOK_URL below (if using ngrok locally, use your ngrok url).
// 4. Save the project (click the Floppy Disk icon).
// 5. Click the Clock icon (Triggers) on the left sidebar.
// 6. Click "+ Add Trigger" in the bottom-right.
// 7. Configure:
//    - Choose which function to run: "installedOnEdit"
//    - Choose which deployment should run: "Head"
//    - Event source: "From spreadsheet"
//    - Event type: "On edit"
// 8. Click Save. It will ask for permissions. Authorize it using your Google Account.
// =========================================================================

var WEBHOOK_URL = "YOUR_APP_URL/api/webhooks/sheets"; // e.g., https://xyz.ngrok-free.app/api/webhooks/sheets or your production URL
var SECRET = "bat-su-ojt-secret-key-2026";          // Must match SHEETS_WEBHOOK_SECRET in .env.local

function installedOnEdit(e) {
  if (!e) return;
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  
  // Ignore template tab or other non-student tabs
  var lowerName = sheetName.toLowerCase();
  if (lowerName.indexOf("template") !== -1 || lowerName.indexOf("lastname") !== -1) {
    return;
  }
  
  // Find which rows were edited
  var startRow = e.range.getRow();
  var numRows = e.range.getNumRows();
  
  var edits = [];
  
  for (var i = 0; i < numRows; i++) {
    var currentRow = startRow + i;
    if (currentRow === 1) continue; // Skip header row
    
    // Read the entire row (11 columns for Master, 7 columns for Individual sheets)
    var isMaster = lowerName.indexOf("master") !== -1;
    var lastCol = isMaster ? 11 : 7;
    
    var rowRange = sheet.getRange(currentRow, 1, 1, lastCol);
    var rowData = rowRange.getValues()[0];
    
    // Format dates to YYYY-MM-DD so the backend receives consistent strings
    for (var colIdx = 0; colIdx < rowData.length; colIdx++) {
      var val = rowData[colIdx];
      if (val instanceof Date) {
        var yyyy = val.getFullYear();
        var mm = ("0" + (val.getMonth() + 1)).slice(-2);
        var dd = ("0" + val.getDate()).slice(-2);
        rowData[colIdx] = yyyy + "-" + mm + "-" + dd;
      }
    }
    
    edits.push({
      row: currentRow,
      rowData: rowData
    });
  }
  
  if (edits.length === 0) return;
  
  var payload = {
    secret: SECRET,
    sheetName: sheetName,
    edits: edits
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Webhook Response: " + response.getContentText());
  } catch (err) {
    Logger.log("Webhook Error: " + err.toString());
  }
}
