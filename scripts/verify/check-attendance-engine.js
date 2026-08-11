// scripts/verify/check-attendance-engine.js
import { calculate } from '../../Backend/src/services/business/calculate.js';
import resolvePolicy from '../../Backend/src/services/business/attendance/resolvePolicy.js';
import holiday from '../../Backend/src/services/business/attendance/holiday.js';
import leave from '../../Backend/src/services/business/attendance/leave.js';
import permission from '../../Backend/src/services/business/attendance/permission.js';
import workHours from '../../Backend/src/services/business/time/workHours.js';
import status from '../../Backend/src/services/business/attendance/status.js';
import overtime from '../../Backend/src/services/business/time/overtime.js';
import fine from '../../Backend/src/services/business/attendance/fine.js';
import { buildAttendanceSnapshot } from '../../Backend/src/services/business/attendance/snapshot.js';

const HANDLERS = [
  resolvePolicy,
  holiday,
  leave,
  permission,
  workHours,
  status,
  overtime,
  fine
];

async function runVerificationTests() {
  console.log('--- RUNNING ATTENDANCE DYNAMIC ENGINE VERIFICATION TESTS ---');

  let passed = 0;
  let failed = 0;

  // Test 1: Standard On-Time Check-In
  try {
    const context = {
      date: new Date('2026-08-06T00:00:00Z'),
      checkIn: new Date('2026-08-06T09:30:00Z'),
      checkOut: new Date('2026-08-06T18:00:00Z'),
      punches: [
        { checkIn: new Date('2026-08-06T09:30:00Z'), checkOut: new Date('2026-08-06T18:00:00Z') }
      ]
    };
    const result = await calculate({ context, handlers: HANDLERS });
    const snapshot = buildAttendanceSnapshot(result);

    if (snapshot.result.status === 'Check-Out' || snapshot.result.status === 'Present') {
      console.log('✅ Test 1 (Standard On-Time): Passed. Status:', snapshot.result.status, 'Hours:', result.workHours);
      passed++;
    } else {
      console.error('❌ Test 1 Failed: Expected Present/Check-Out, got:', snapshot.result.status);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 1 Exception:', err.message);
    failed++;
  }

  // Test 2: Late Check-In with Grace Period Allowance (9:40 AM with 15m Grace)
  try {
    const context = {
      date: new Date('2026-08-06T00:00:00Z'),
      checkIn: new Date('2026-08-06T09:40:00Z'),
      checkOut: new Date('2026-08-06T18:00:00Z'),
      policy: {
        shiftConfig: { graceMinutesCheckIn: 15 }
      },
      shift: { startTime: '09:30', endTime: '18:00' }
    };
    const result = await calculate({ context, handlers: HANDLERS });
    if (result.lateMinutes === 0) {
      console.log('✅ Test 2 (Late Check-In within Grace): Passed. Late Minutes:', result.lateMinutes);
      passed++;
    } else {
      console.error('❌ Test 2 Failed: Expected 0 late minutes within grace, got:', result.lateMinutes);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 2 Exception:', err.message);
    failed++;
  }

  // Test 3: Overtime Calculation (9.5 worked hours -> 1.5 OT hours)
  try {
    const context = {
      date: new Date('2026-08-06T00:00:00Z'),
      checkIn: new Date('2026-08-06T09:00:00Z'),
      checkOut: new Date('2026-08-06T18:30:00Z'),
      policy: {
        overtimeRules: { enabled: true, overtimeThresholdMins: 480, minOvertimeMins: 30 }
      },
      shift: { overtimeThreshold: 480 }
    };
    const result = await calculate({ context, handlers: HANDLERS });
    if (result.overtimeHours > 0) {
      console.log('✅ Test 3 (Overtime Calculation): Passed. OT Hours:', result.overtimeHours);
      passed++;
    } else {
      console.error('❌ Test 3 Failed: Expected > 0 OT hours, got:', result.overtimeHours);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 3 Exception:', err.message);
    failed++;
  }

  // Test 4: Permission Auto-Deduction First (75m late check-in - 60m permission = 15m remaining <= 15m grace -> 0 late mins & 0 fine)
  try {
    const context = {
      date: new Date('2026-08-06T00:00:00Z'),
      checkIn: new Date('2026-08-06T10:45:00Z'),
      checkOut: new Date('2026-08-06T18:00:00Z'),
      approvedPermissionHours: 1.0,
      policy: {
        permissionRules: { enabled: true },
        shiftConfig: { graceMinutesCheckIn: 15 },
        fineAndLopRules: { enableLateFines: true, lateFineType: 'Fixed', lateFineAmount: 100 }
      },
      shift: { startTime: '09:30', endTime: '18:00' }
    };
    const result = await calculate({ context, handlers: HANDLERS });
    if (result.lateMinutes === 0 && result.fineAmount === 0) {
      console.log('✅ Test 4 (Permission Full Auto-Deduct): Passed. Late Minutes:', result.lateMinutes, 'Fine:', result.fineAmount);
      passed++;
    } else {
      console.error('❌ Test 4 Failed: Expected 0 late mins and 0 fine after deducting permission, got lateMinutes:', result.lateMinutes, 'fine:', result.fineAmount);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 4 Exception:', err.message);
    failed++;
  }

  // Test 5: Partial Auto-Deduction (85m late check-in - 60m permission = 25m remaining > 15m grace -> 25 late mins & ₹50 fine @ ₹2/min)
  try {
    const context = {
      date: new Date('2026-08-06T00:00:00Z'),
      checkIn: new Date('2026-08-06T10:55:00Z'),
      checkOut: new Date('2026-08-06T18:00:00Z'),
      approvedPermissionHours: 1.0,
      policy: {
        permissionRules: { enabled: true },
        shiftConfig: { graceMinutesCheckIn: 15 },
        fineAndLopRules: { enableLateFines: true, lateFineType: 'PerMinute', lateFineAmount: 2 }
      },
      shift: { startTime: '09:30', endTime: '18:00' }
    };
    const result = await calculate({ context, handlers: HANDLERS });
    if (result.lateMinutes === 25 && result.fineAmount === 50) {
      console.log('✅ Test 5 (Partial Auto-Deduct & Excess Fine): Passed. Late Minutes:', result.lateMinutes, 'Fine: ₹', result.fineAmount);
      passed++;
    } else {
      console.error('❌ Test 5 Failed: Expected 25 late mins and ₹50 fine, got lateMinutes:', result.lateMinutes, 'fine:', result.fineAmount);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 5 Exception:', err.message);
    failed++;
  }

  console.log(`--- SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runVerificationTests();
