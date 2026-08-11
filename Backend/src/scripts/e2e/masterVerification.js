import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { runEmployeeLifecycle } from './employeeLifecycle.test.js';
import { runAssetLifecycle } from './assetLifecycle.test.js';
import { runProjectLifecycle } from './projectLifecycle.test.js';
import { runTicketLifecycle } from './ticketLifecycle.test.js';
import { runResourceAllocation } from './resourceAllocation.test.js';
import { runPayrollLifecycle } from './payrollLifecycle.test.js';
import { runAttendanceLifecycle } from './attendanceLifecycle.test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

export async function runAllVerification() {
  const logFilePath = path.join(process.cwd(), 'verification_report.txt');
  const logStream = fs.createWriteStream(logFilePath, { flags: 'w' });

  const originalLog = console.log;
  const originalError = console.error;

  const stripAnsi = (str) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  };

  console.log = function (...args) {
    const formatted = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    originalLog.apply(console, args);
    logStream.write(stripAnsi(formatted) + '\n');
  };

  console.error = function (...args) {
    const formatted = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    originalError.apply(console, args);
    logStream.write('[ERROR] ' + stripAnsi(formatted) + '\n');
  };

  const restoreConsoleAndCloseLog = () => {
    console.log = originalLog;
    console.error = originalError;
    logStream.end();
    console.log(`📝 Log file successfully written to: ${logFilePath}`);
  };

  try {
    console.log('\n==================================================');
    console.log('🚀 Workhub ERP: STARTING SYSTEM BUSINESS VERIFICATION');
    console.log('==================================================\n');

    // Establish connection and configure test policies
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';
    console.log('🔌 Connecting to MongoDB for policy initialization...');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    await import('../../models/Collection.js');

    const Role = mongoose.model('roles');
    const AccessPolicy = mongoose.model('access_policies');
    const { setCache } = await import('../../utils/cache.js');

    const adminRoles = await Role.find({ name: /admin|hr/i }).lean();
    console.log('🛡️ Auto-configuring test access policies for roles:', adminRoles.map(r => r.name));

    const E2E_MODELS = [
      'employees', 'attendances', 'leaves', 'time_tracker_sessions', 'tasks',
      'tickets', 'ticket_comments', 'clients', 'project_types', 'milestones',
      'assets_categories', 'assets', 'assets_allocations', 'assets_repairs',
      'assets_vendors', 'assets_purchases', 'assets_invoices', 'assets_payments', 'assets_stock_ledgers', 'payrolls'
    ];

    for (const role of adminRoles) {
      for (const modelName of E2E_MODELS) {
        await AccessPolicy.findOneAndUpdate(
          { role: role._id, modelName },
          {
            $set: {
              role: role._id,
              modelName,
              permissions: { read: true, create: true, update: true, delete: true },
              allowAccess: { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] },
              forbiddenAccess: { read: [], create: [], update: [], delete: [] },
              registry: [],
              conditions: {}
            }
          },
          { upsert: true }
        );
      }
    }
    await setCache();
    console.log('✅ Temporary E2E test access policies configured and cached.');

    const results = {
      employee: { name: 'Employee Lifecycle', status: 'FAIL', error: null },
      asset: { name: 'Asset Lifecycle', status: 'FAIL', error: null },
      project: { name: 'Project Lifecycle', status: 'FAIL', error: null },
      ticket: { name: 'Ticket Lifecycle', status: 'FAIL', error: null },
      resource: { name: 'Resource Allocation', status: 'FAIL', error: null },
      payroll: { name: 'Payroll Lifecycle', status: 'FAIL', error: null },
      attendance: { name: 'Attendance Lifecycle', status: 'FAIL', error: null }
    };

    // Run Employee Lifecycle
    try {
      console.log('\n🏃 Running Employee Lifecycle test...');
      await runEmployeeLifecycle();
      results.employee.status = 'PASS';
    } catch (err) {
      results.employee.error = err.message;
    }

    // Run Asset Lifecycle
    try {
      console.log('\n🏃 Running Asset Lifecycle test...');
      await runAssetLifecycle();
      results.asset.status = 'PASS';
    } catch (err) {
      results.asset.error = err.message;
    }

    // Run Project Lifecycle
    try {
      console.log('\n🏃 Running Project Lifecycle test...');
      await runProjectLifecycle();
      results.project.status = 'PASS';
    } catch (err) {
      results.project.error = err.message;
    }

    // Run Ticket Lifecycle
    try {
      console.log('\n🏃 Running Ticket Lifecycle test...');
      await runTicketLifecycle();
      results.ticket.status = 'PASS';
    } catch (err) {
      results.ticket.error = err.message;
    }

    // Run Resource Allocation Lifecycle
    try {
      console.log('\n🏃 Running Resource Allocation test...');
      await runResourceAllocation();
      results.resource.status = 'PASS';
    } catch (err) {
      results.resource.error = err.message;
    }

    // Run Payroll Lifecycle
    try {
      console.log('\n🏃 Running Payroll Lifecycle test...');
      await runPayrollLifecycle();
      results.payroll.status = 'PASS';
    } catch (err) {
      results.payroll.error = err.message;
    }

    // Run Attendance Lifecycle
    try {
      console.log('\n🏃 Running Attendance Lifecycle test...');
      await runAttendanceLifecycle();
      results.attendance.status = 'PASS';
    } catch (err) {
      results.attendance.error = err.message;
    }

    // Calculate Health Score
    // Base score from lifecycles passing (100% if all 7 pass, ~14.28% per lifecycle)
    let passedCount = 0;
    for (const key in results) {
      if (results[key].status === 'PASS') passedCount++;
    }

    let baseScore = (passedCount / 7) * 100;

    // Dynamic system health checks (Index Audit)
    let indexHealthPenalty = 0;
    try {
      const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGO_URI);
      }

      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      let duplicatesFound = 0;

      for (const collInfo of collections) {
        const collName = collInfo.name;
        if (collName.startsWith('system.')) continue;

        const indexes = await db.collection(collName).indexes();
        const indexFields = indexes.map(idx => JSON.stringify(idx.key));
        const uniqueFields = new Set(indexFields);
        if (indexFields.length !== uniqueFields.size) {
          duplicatesFound += (indexFields.length - uniqueFields.size);
        }
      }

      if (duplicatesFound > 0) {
        indexHealthPenalty = Math.min(8, duplicatesFound * 2);
        console.log(`\n⚠️ System Audit Warning: Found ${duplicatesFound} redundant index configurations in MongoDB schemas (-${indexHealthPenalty}% Health Score penalty).`);
      }
    } catch (e) {
      indexHealthPenalty = 8;
    }

    let finalHealthScore = Math.max(0, baseScore - indexHealthPenalty);

    console.log('\n==================================================');
    console.log('📊 Workhub ERP: SYSTEM VERIFICATION REPORT');
    console.log('==================================================');

    const printStatus = (title, status, error) => {
      const statusText = status === 'PASS' ? '\x1b[32mPASS\x1b[0m' : `\x1b[31mFAIL (${error})\x1b[0m`;
      console.log(`${title}: ${statusText}`);
    };

    printStatus('Employee Lifecycle', results.employee.status, results.employee.error);
    printStatus('Asset Lifecycle', results.asset.status, results.asset.error);
    printStatus('Project Lifecycle', results.project.status, results.project.error);
    printStatus('Ticket Lifecycle', results.ticket.status, results.ticket.error);
    printStatus('Resource Allocation', results.resource.status, results.resource.error);
    printStatus('Payroll Lifecycle', results.payroll.status, results.payroll.error);
    printStatus('Attendance Lifecycle', results.attendance.status, results.attendance.error);

    console.log('--------------------------------------------------');
    console.log(`Overall Health Score: \x1b[36m${finalHealthScore.toFixed(1)}%\x1b[0m`);
    console.log('==================================================\n');

    if (passedCount < 7) {
      throw new Error('One or more E2E business lifecycle checks failed.');
    }

    return true;
  } finally {
    restoreConsoleAndCloseLog();
  }
}
