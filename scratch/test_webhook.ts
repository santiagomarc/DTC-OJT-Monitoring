// Automated verification script to test webhook (Sheets -> DB sync).
// Run with: npx tsx --env-file=.env.local scratch/test_webhook.ts

(global as any).WebSocket = class {};

import { createServiceClient } from '../src/lib/supabase/server';

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/sheets';
const WEBHOOK_SECRET = process.env.SHEETS_WEBHOOK_SECRET || 'bat-su-ojt-secret-key-2026';

async function verify() {
  console.log('🔄 Setting up temporary student for webhook test...');
  const supabase = await createServiceClient();

  const tempStudent = {
    first_name: 'WEBHOOKFIRST',
    last_name: 'WEBHOOKLAST',
    sr_code: '99-WEB-999',
    email: 'webhook_test@example.com',
    program: 'BSCS',
    required_ojt_hours: 200,
    role: 'student'
  };

  // 1. Insert temporary student
  const { data: student, error } = await supabase
    .from('students')
    .insert(tempStudent)
    .select('id')
    .single();

  if (error || !student) {
    console.error('❌ Failed to insert temporary student:', error);
    process.exit(1);
  }

  console.log(`✅ Temporary student created with ID: ${student.id}`);

  try {
    // ── TEST 1: MASTER LIST UPDATE ──
    console.log('\n🧪 Test 1: Testing Master List update via webhook...');
    // Columns A to K:
    // A: Last, B: First, C: SR-Code, D: Email, E: Program, F: Req Hours, G: Rem, H: Est, I: Act, J: Proj, K: Github
    const masterPayload = {
      secret: WEBHOOK_SECRET,
      sheetName: 'Master List',
      edits: [
        {
          row: 10,
          rowData: [
            'WEBHOOKLAST',
            'WEBHOOKFIRST',
            '99-WEB-999',
            'webhook_test@example.com',
            'BSCS',
            '200',
            '', // remaining
            '', // est
            '', // act
            'WEBHOOK PROJECT', // col J: ASSIGNED PROJECT
            'https://github.com/webhook-test/repo' // col K: GITHUB LINK
          ]
        }
      ]
    };

    const res1 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(masterPayload)
    });

    const res1Text = await res1.text();
    console.log('Response 1 Status:', res1.status);
    let data1;
    try {
      data1 = JSON.parse(res1Text);
      console.log('Response 1 Data:', data1);
    } catch (e) {
      console.log('Response 1 is not JSON. Text snippet:', res1Text.substring(0, 500));
    }

    // Verify DB update
    const { data: updatedStudent } = await supabase
      .from('students')
      .select('assigned_project, github_link')
      .eq('id', student.id)
      .single();

    if (
      updatedStudent?.assigned_project === 'WEBHOOK PROJECT' &&
      updatedStudent?.github_link === 'https://github.com/webhook-test/repo'
    ) {
      console.log('✅ Test 1 Passed: Student fields updated successfully!');
    } else {
      console.error('❌ Test 1 Failed: DB was not updated correctly. Value:', updatedStudent);
    }

    // ── TEST 2: INDIVIDUAL SHEET LOG INSERT ──
    console.log('\n🧪 Test 2: Testing Individual Sheet attendance log insertion...');
    // Tab name is student's Last, First name
    const logPayload = {
      secret: WEBHOOK_SECRET,
      sheetName: 'WEBHOOKLAST, WEBHOOKFIRST',
      edits: [
        {
          row: 2,
          rowData: [
            '2026-06-23', // Date
            'Tue', // Day
            '08:00 AM', // Time In
            '05:00 PM', // Time Out
            '9', // Hours
            'Planned webhook testing', // Planned
            'Accomplished webhook testing' // Actual
          ]
        }
      ]
    };

    const res2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logPayload)
    });

    const data2 = await res2.json();
    console.log('Response 2 Status:', res2.status);
    console.log('Response 2 Data:', data2);

    // Verify DB update
    const { data: log } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', student.id)
      .eq('date', '2026-06-23')
      .maybeSingle();

    if (
      log &&
      log.time_in === '08:00:00' &&
      log.time_out === '17:00:00' &&
      log.planned_task === 'Planned webhook testing' &&
      log.actual_accomplishment === 'Accomplished webhook testing'
    ) {
      console.log('✅ Test 2 Passed: Attendance log upserted successfully!');
    } else {
      console.error('❌ Test 2 Failed: DB log was not updated correctly. Value:', log);
    }

    // ── TEST 3: INDIVIDUAL SHEET LOG DELETION ──
    console.log('\n🧪 Test 3: Testing Individual Sheet attendance log deletion (clearing Time In)...');
    // Clear Time In (col C)
    const deletePayload = {
      secret: WEBHOOK_SECRET,
      sheetName: 'WEBHOOKLAST, WEBHOOKFIRST',
      edits: [
        {
          row: 2,
          rowData: [
            '2026-06-23', // Date
            'Tue', // Day
            '', // Time In (cleared)
            '05:00 PM',
            '0',
            '',
            ''
          ]
        }
      ]
    };

    const res3 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deletePayload)
    });

    const data3 = await res3.json();
    console.log('Response 3 Status:', res3.status);
    console.log('Response 3 Data:', data3);

    // Verify DB delete
    const { data: deletedLog } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', student.id)
      .eq('date', '2026-06-23')
      .maybeSingle();

    if (!deletedLog) {
      console.log('✅ Test 3 Passed: Attendance log deleted successfully when Time In cleared!');
    } else {
      console.error('❌ Test 3 Failed: DB log was not deleted. Value:', deletedLog);
    }

  } catch (err) {
    console.error('❌ Error during testing:', err);
  } finally {
    // 🧹 Clean up student (logs are cascade deleted)
    console.log('\n🧹 Cleaning up test student...');
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', student.id);

    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError);
    } else {
      console.log('✅ Database cleaned up!');
    }
  }
}

verify();
