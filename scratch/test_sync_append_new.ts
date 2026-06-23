// Automated verification script to test append logic for new students.
// Run with: npx tsx --env-file=.env.local scratch/test_sync_append_new.ts

(global as any).WebSocket = class {};

import { createServiceClient } from '../src/lib/supabase/server';
import { syncStudentToSheets } from '../src/lib/sync';

async function verify() {
  console.log('🔄 Setting up temporary student...');
  const supabase = await createServiceClient();

  const tempStudent = {
    first_name: 'TESTFIRSTNAME',
    last_name: 'TESTLASTNAME',
    sr_code: '99-TEST-999',
    email: 'test_temp_student@example.com',
    program: 'BSIT',
    required_ojt_hours: 150,
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
  console.log('🔄 Syncing temporary student (should append to Master List)...');

  try {
    await syncStudentToSheets(student.id);
    console.log('✅ Sync completed for temporary student!');
  } catch (err) {
    console.error('❌ Sync failed:', err);
  } finally {
    // 2. Clean up temporary student
    console.log('🧹 Cleaning up temporary student from database...');
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', student.id);

    if (deleteError) {
      console.error('❌ Failed to clean up database:', deleteError);
    } else {
      console.log('✅ Database cleaned up!');
    }
    console.log('⚠️ Please check the Google Sheet Master List for "TESTLASTNAME, TESTFIRSTNAME" on the last row and delete the row and tab manually.');
  }
}

verify();
