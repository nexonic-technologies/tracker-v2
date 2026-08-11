/**
 * runSystemVerification.js
 * Single-command launcher for all Tracker E2E business lifecycle checks.
 * Run: node runSystemVerification.js
 */

import { runAllVerification } from './src/scripts/e2e/masterVerification.js';

runAllVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Verification Failed:', err.message);
    process.exit(1);
  });
