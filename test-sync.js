require('dotenv').config({ path: '.env.local' });
const { syncStudentToSheets } = require('./src/lib/sync.ts');
// We need to run this as TS. Let's use tsx.
