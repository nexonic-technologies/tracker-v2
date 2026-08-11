import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Force Node.js to use reliable public DNS for MongoDB SRV lookups
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

export async function runPayrollLifecycle() {
  console.log('🔌 Connecting to MongoDB...');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  console.log('🔄 Initializing Cache and Policy Cache...');
  const { setCache } = await import('../../utils/cache.js');
  await setCache();

  const { buildQuery } = await import('../../utils/policy/policyEngine.js');
  const { default: models } = await import('../../models/Collection.js');

  // 1. Prepare roles
  let hrRole = await models.roles.findOne({ name: /hr|admin/i });
  if (!hrRole) {
    hrRole = await models.roles.create({ name: 'hr' });
  }
  let employeeRole = await models.roles.findOne({ name: /employee/i });
  if (!employeeRole) {
    employeeRole = await models.roles.create({ name: 'employee' });
  }
  await setCache();

  // 2. Prepare access policies
  // HR Role has full access to payrolls and management capabilities
  await models.access_policies.findOneAndUpdate(
    { role: hrRole._id, modelName: 'payrolls' },
    {
      $set: {
        role: hrRole._id,
        modelName: 'payrolls',
        permissions: { read: true, create: true, update: true, delete: true },
        allowAccess: { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] },
        forbiddenAccess: { read: [], create: [], update: [], delete: [] }
      }
    },
    { upsert: true }
  );

  // Employee Role can only read their own payroll records (isSelf)
  await models.access_policies.findOneAndUpdate(
    { role: employeeRole._id, modelName: 'payrolls' },
    {
      $set: {
        role: employeeRole._id,
        modelName: 'payrolls',
        permissions: { read: true, create: false, update: false, delete: false },
        allowAccess: { read: ['*'] },
        forbiddenAccess: { read: [], create: [], update: [], delete: [] },
        conditions: {
          read: [{ registry: 'isSelf', effect: 'allow' }]
        }
      }
    },
    { upsert: true }
  );
  await setCache();

  // 3. Prepare test entities
  const testEmployeeId = new mongoose.Types.ObjectId();
  const anotherEmployeeId = new mongoose.Types.ObjectId();
  const hrUserId = new mongoose.Types.ObjectId();

  // Create salary structure for the test employee
  console.log('✓ Setting up salary structure for test employee...');
  const today = new Date();
  const effectiveFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const salaryStructure = await models.salary_structures.create({
    employeeId: testEmployeeId,
    version: 1,
    effectiveFrom,
    ctc: 600000, // Monthly CTC = 50,000
    earnings: [
      { name: 'Basic', type: 'fixed', amount: 25000, taxable: true, isProratable: true },
      { name: 'HRA', type: 'percentage_of_basic', amount: 40, taxable: true, isProratable: true },
      { name: 'Bonus', type: 'fixed', amount: 5000, taxable: true, isProratable: false }
    ],
    deductions: [
      { name: 'PF', type: 'statutory', amount: 12 }, // Statutory PF
      { name: 'TDS', type: 'fixed', amount: 1000 }
    ],
    pfEmployeePercent: 12,
    pfCeiling: 15000,
    esiApplicable: false,
    createdBy: hrUserId
  });

  console.log('\n=========================================');
  console.log('🟢 RUNNING FLOW 1: HAPPY FLOW');
  console.log('=========================================');

  // 1. Process Payroll (HR Role creates)
  console.log('1. Computing payroll run for employee...');
  const t0 = performance.now();
  const payrollRecord = await buildQuery({
    role: hrRole._id.toString(),
    userId: hrUserId.toString(),
    action: 'create',
    modelName: 'payrolls',
    body: {
      employeeId: testEmployeeId.toString(),
      month: 7,
      year: 2026
    }
  });
  const t1 = performance.now();
  console.log(`✓ Payroll computed successfully (DB Time: ${(t1 - t0).toFixed(2)}ms)`);
  console.log(`Gross Salary: ${payrollRecord.grossSalary}`);
  console.log(`Net Salary: ${payrollRecord.netSalary}`);
  console.log(`Lop Days: ${payrollRecord.lopDays}`);
  console.log(`PF Earned Deduction: ${payrollRecord.deductionBreakdown?.get('PF')}`);
  console.log(`TDS Earned Deduction: ${payrollRecord.deductionBreakdown?.get('TDS')}`);
  console.log(`Initial Status: ${payrollRecord.status}`);

  // 2. Transition Processed -> Approved
  console.log('\n2. Transitioning status to Approved (HR role)...');
  const t2 = performance.now();
  const approvedRecord = await buildQuery({
    role: hrRole._id.toString(),
    userId: hrUserId.toString(),
    action: 'update',
    modelName: 'payrolls',
    docId: payrollRecord._id.toString(),
    body: {
      status: 'Approved'
    }
  });
  const t3 = performance.now();
  console.log(`✓ Status transitioned to Approved (DB Time: ${(t3 - t2).toFixed(2)}ms)`);
  console.log(`Updated Status: ${approvedRecord.status}`);
  console.log(`Approved By: ${approvedRecord.approvedBy}`);

  // 3. Transition Approved -> Paid
  console.log('\n3. Transitioning status to Paid (HR role)...');
  const paidRecord = await buildQuery({
    role: hrRole._id.toString(),
    userId: hrUserId.toString(),
    action: 'update',
    modelName: 'payrolls',
    docId: payrollRecord._id.toString(),
    body: {
      status: 'Paid'
    }
  });
  console.log(`✓ Status transitioned to Paid.`);
  console.log(`Updated Status: ${paidRecord.status}`);
  console.log(`Paid At: ${paidRecord.paidAt}`);

  console.log('\n=========================================');
  console.log('🔴 RUNNING FLOW 2: RESTRICTION FLOW (ABAC)');
  console.log('=========================================');

  // 1. Employee trying to view their own payroll
  console.log('1. Trying to read own payroll as employee...');
  const ownRead = await buildQuery({
    role: employeeRole._id.toString(),
    userId: testEmployeeId.toString(),
    action: 'read',
    modelName: 'payrolls',
    docId: payrollRecord._id.toString()
  });
  if (ownRead && ownRead.employeeId.toString() === testEmployeeId.toString()) {
    console.log(`✓ Access allowed: Read own record. Net Salary: ${ownRead.netSalary}`);
  } else {
    console.log('❌ FAILED: Employee blocked from reading own payroll!');
  }

  // 2. Employee trying to view another employee's payroll
  console.log('\n2. Trying to read another employee\'s payroll as employee...');
  try {
    const maliciousRead = await buildQuery({
      role: employeeRole._id.toString(),
      userId: anotherEmployeeId.toString(),
      action: 'read',
      modelName: 'payrolls',
      docId: payrollRecord._id.toString()
    });
    if (!maliciousRead) {
      console.log('✓ Blocked: Read returned null/empty (correct behavior).');
    } else {
      console.log('❌ FAILED: Employee could access another employee\'s payroll record!');
    }
  } catch (err) {
    console.log(`✓ Blocked with error (correct behavior): ${err.message}`);
  }

  // 3. Employee trying to trigger a payroll creation
  console.log('\n3. Trying to compute payroll as a standard employee...');
  try {
    await buildQuery({
      role: employeeRole._id.toString(),
      userId: testEmployeeId.toString(),
      action: 'create',
      modelName: 'payrolls',
      body: {
        employeeId: anotherEmployeeId.toString(),
        month: 7,
        year: 2026
      }
    });
    console.log('❌ FAILED: Employee was allowed to create a payroll record!');
  } catch (err) {
    console.log(`✓ Blocked: ${err.message}`);
  }

  console.log('\n=========================================');
  console.log('🟡 RUNNING FLOW 3: EDGE CASES & IMMUTABILITY');
  console.log('=========================================');

  // 1. Check frozen validation (Approved/Paid record cannot have gross/net mutated)
  console.log('1. Trying to update frozen salary values directly on Paid payroll...');
  try {
    await buildQuery({
      role: hrRole._id.toString(),
      userId: hrUserId.toString(),
      action: 'update',
      modelName: 'payrolls',
      docId: payrollRecord._id.toString(),
      body: {
        grossSalary: 999999
      }
    });
    console.log('❌ FAILED: HR was allowed to modify frozen salary values directly!');
  } catch (err) {
    console.log(`✓ Blocked (correct behavior): ${err.message}`);
  }

  // 2. Check invalid transition (Processed directly to Paid)
  console.log('\n2. Testing invalid state transition (Processed directly to Paid)...');

  // Create a clean record to test invalid transition
  const newPayrollRecord = await buildQuery({
    role: hrRole._id.toString(),
    userId: hrUserId.toString(),
    action: 'create',
    modelName: 'payrolls',
    body: {
      employeeId: testEmployeeId.toString(),
      month: 8,
      year: 2026
    }
  });

  try {
    await buildQuery({
      role: hrRole._id.toString(),
      userId: hrUserId.toString(),
      action: 'update',
      modelName: 'payrolls',
      docId: newPayrollRecord._id.toString(),
      body: {
        status: 'Paid'
      }
    });
    console.log('❌ FAILED: Processed record transitioned directly to Paid!');
  } catch (err) {
    console.log(`✓ Rejected transition (correct behavior): ${err.message}`);
  }

  // Clean up
  console.log('\n🗑️ Cleaning up test verification documents...');
  await models.salary_structures.deleteOne({ _id: salaryStructure._id });
  await models.payrolls.deleteMany({ employeeId: testEmployeeId });
  console.log('✓ Test data removed.');

  await mongoose.disconnect();
  console.log('\n🔌 MongoDB connection closed. Verification run completed.\n');
  return true;
}

// Support running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPayrollLifecycle()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
