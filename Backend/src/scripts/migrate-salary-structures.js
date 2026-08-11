import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Employee from '../models/Employee.js';
import SalaryStructure from '../models/SalaryStructure.js';
import salaryRevisionService from '../services/salaryRevisionService.js';

async function runMigration() {
  console.log('🚀 [Migration] Starting SalaryStructure Reference Migration...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracker';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB.');

  const employees = await Employee.find({
    $or: [
      { salaryStructure: null },
      { salaryStructure: { $exists: false } }
    ]
  }).lean();

  console.log(`Found ${employees.length} employee(s) needing SalaryStructure migration.`);
  let migratedCount = 0;

  for (const emp of employees) {
    try {
      const existingStruct = await SalaryStructure.findOne({ employeeId: emp._id }).lean();
      if (existingStruct) {
        await Employee.findByIdAndUpdate(emp._id, { salaryStructure: existingStruct._id });
        console.log(`[Migration] Linked existing SalaryStructure ${existingStruct._id} to employee ${emp._id}`);
        migratedCount++;
        continue;
      }

      const flatSalary = emp.salaryDetails || {};
      const ctc = flatSalary.ctc || flatSalary.package || 150024;
      const basic = flatSalary.basic || Math.round(ctc * 0.5);

      const effectiveFrom = emp.professionalInfo?.doj || emp.createdAt || new Date();

      const newStruct = await salaryRevisionService.createOrReviseStructure({
        employeeId: emp._id,
        ctc,
        basicSalary: basic,
        effectiveFrom,
        reason: 'Automated Migration from legacy flat salaryDetails',
        changeType: 'InitialBaseline'
      });

      console.log(`[Migration] Created new SalaryStructure v${newStruct.version} for employee ${emp.basicInfo?.firstName || emp._id}`);
      migratedCount++;
    } catch (err) {
      console.error(`❌ [Migration] Failed for employee ${emp._id}:`, err.message);
    }
  }

  console.log(`✅ [Migration Complete] Migrated ${migratedCount} employee(s).`);
  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
