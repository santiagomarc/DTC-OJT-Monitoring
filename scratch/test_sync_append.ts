// Standalone test script to execute student sync to Google Sheets
// Run with: npx tsx --env-file=.env.local scratch/test_sync_append.ts

// Polyfill WebSocket for Node
(global as any).WebSocket = class {};

import { createServiceClient } from '../src/lib/supabase/server';
import { syncStudentToSheets } from '../src/lib/sync';

async function test() {
  console.log('🔄 Initializing test sync...');
  const supabase = await createServiceClient();

  const { data: student, error } = await supabase
    .from('students')
    .select('id, last_name, first_name')
    .eq('role', 'student')
    .limit(1)
    .single();

  if (error || !student) {
    console.error('❌ Failed to fetch test student:', error);
    process.exit(1);
  }

  console.log(`📋 Found test student: ${student.first_name} ${student.last_name} (ID: ${student.id})`);
  console.log('🔄 Triggering sync to Google Sheets...');

  try {
    await syncStudentToSheets(student.id);
    console.log('✅ Sync complete! Check Google Sheet.');
  } catch (err) {
    console.error('❌ Sync failed:', err);
  }
}

test();
