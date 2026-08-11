import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Employee from '../models/Employee.js';
import EmployeeLifecycleHistory from '../models/EmployeeLifecycleHistory.js';
import lifecycleHistoryService from '../services/lifecycleHistoryService.js';

async function runBackfill() {
  console.log('🚀 [Backfill] Starting Employee Lifecycle Baseline Backfill...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracker';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB.');

  const employees = await Employee.find({ isDeleted: { $ne: true } }).lean();
  console.log(`Found ${employees.length} active employee(s) to check.`);

  let createdCount = 0;

  for (const emp of employees) {
    try {
      const existingHistoryCount = await EmployeeLifecycleHistory.countDocuments({ employeeId: emp._id });
      if (existingHistoryCount > 0) {
        console.log(`[Backfill] Employee ${emp.basicInfo?.firstName || emp._id} already has ${existingHistoryCount} history log(s). Skipping.`);
        continue;
      }

      const effectiveDate = emp.professionalInfo?.doj || emp.createdAt || new Date();

      await lifecycleHistoryService.logEvent({
        employeeId: emp._id,
        changeType: 'InitialBaseline',
        effectiveDate,
        previousValue: null,
        newValue: {
          department: emp.professionalInfo?.department,
          designation: emp.professionalInfo?.designation,
          reportingManager: emp.professionalInfo?.reportingManager,
          role: emp.professionalInfo?.role,
          level: emp.professionalInfo?.level,
          status: emp.status
        },
        reason: 'Automated baseline history backfill'
      });

      console.log(`[Backfill] Created InitialBaseline history record for ${emp.basicInfo?.firstName || emp._id}`);
      createdCount++;
    } catch (err) {
      console.error(`❌ [Backfill] Failed for employee ${emp._id}:`, err.message);
    }
  }

  console.log(`✅ [Backfill Complete] Created ${createdCount} baseline lifecycle history record(s).`);
  await mongoose.disconnect();
}

runBackfill().catch(err => {
  console.error('Fatal backfill error:', err);
  process.exit(1);
});
