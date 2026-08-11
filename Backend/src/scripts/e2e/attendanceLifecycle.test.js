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

export async function runAttendanceLifecycle() {
  console.log('🔌 Connecting to MongoDB...');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  console.log('🔄 Initializing Cache and Policy Cache...');
  const { setCache } = await import('../../utils/cache.js');
  await setCache();

  const { buildQuery } = await import('../../utils/policy/policyEngine.js');
  const { default: models } = await import('../../models/Collection.js');

  // Let's resolve or create standard test roles
  let employeeRole = await models.roles.findOne({ name: /employee/i });
  if (!employeeRole) {
    employeeRole = await models.roles.create({ name: 'employee' });
    await setCache();
  }

  // Set policy for employee on attendances if not exists
  const employeePolicy = await models.access_policies.findOneAndUpdate(
    { role: employeeRole._id, modelName: 'attendances' },
    {
      $set: {
        role: employeeRole._id,
        modelName: 'attendances',
        permissions: { read: true, create: true, update: true, delete: false },
        allowAccess: { read: ['*'], create: ['*'], update: ['*'] },
        forbiddenAccess: { read: [], create: [], update: [] },
        conditions: {
          read: [{ registry: 'isSelf', effect: 'allow' }]
        }
      }
    },
    { upsert: true, new: true }
  );
  await setCache();

  const testEmployeeId = new mongoose.Types.ObjectId();
  const anotherEmployeeId = new mongoose.Types.ObjectId();
  const todayStr = new Date().toISOString().split('T')[0];

  console.log('\n=========================================');
  console.log('🟢 RUNNING FLOW 1: HAPPY FLOW');
  console.log('=========================================');

  // 1. Create check-in
  console.log('1. Checking in test employee...');
  const t0 = performance.now();
  const checkInRecord = await buildQuery({
    role: employeeRole._id.toString(),
    userId: testEmployeeId.toString(),
    action: 'create',
    modelName: 'attendances',
    body: {
      employee: testEmployeeId.toString(),
      employeeName: 'Test Verify Employee',
      date: todayStr,
      checkIn: new Date().toISOString(),
      location: { latitude: 11.0, longitude: 77.0 },
      workType: 'fixed'
    }
  });
  const t1 = performance.now();
  console.log(`✓ Check-in successful (DB Time: ${(t1 - t0).toFixed(2)}ms)`);
  console.log(`Document ID: ${checkInRecord._id}`);
  console.log(`Status: ${checkInRecord.status}`);
  console.log(`Punches Count: ${checkInRecord.punches?.length}`);

  // 2. Add second punch (check-out and check-in again)
  console.log('\n2. Updating check-out...');
  const checkOutTime = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes later
  const t2 = performance.now();
  const checkOutRecord = await buildQuery({
    role: employeeRole._id.toString(),
    userId: testEmployeeId.toString(),
    action: 'update',
    modelName: 'attendances',
    docId: checkInRecord._id.toString(),
    body: {
      checkOut: checkOutTime.toISOString(),
      location: { latitude: 11.0, longitude: 77.0 }
    }
  });
  const t3 = performance.now();
  console.log(`✓ Check-out successful (DB Time: ${(t3 - t2).toFixed(2)}ms)`);
  console.log(`Punches:`, JSON.stringify(checkOutRecord.punches));
  console.log(`Calculated Work Hours: ${checkOutRecord.workHours}`);

  // 3. Read back record with isSelf query scope
  console.log('\n3. Reading employee attendance...');
  const t4 = performance.now();
  const readRecord = await buildQuery({
    role: employeeRole._id.toString(),
    userId: testEmployeeId.toString(),
    action: 'read',
    modelName: 'attendances',
    docId: checkInRecord._id.toString()
  });
  const t5 = performance.now();
  console.log(`✓ Read record successful (DB Time: ${(t5 - t4).toFixed(2)}ms)`);
  console.log(`Read Name: ${readRecord.employeeName}`);

  console.log('\n=========================================');
  console.log('🔴 RUNNING FLOW 2: RESTRICTION FLOW (ABAC)');
  console.log('=========================================');

  // Try to read the record as a different employee
  console.log('1. Trying to read another employee\'s attendance...');
  try {
    const maliciousRead = await buildQuery({
      role: employeeRole._id.toString(),
      userId: anotherEmployeeId.toString(),
      action: 'read',
      modelName: 'attendances',
      docId: checkInRecord._id.toString()
    });
    if (!maliciousRead) {
      console.log('✓ Blocked: Read returned null/empty (correct behavior).');
    } else {
      console.log('❌ FAILED: Another employee could read private attendance!');
    }
  } catch (err) {
    console.log(`✓ Blocked with error (correct behavior): ${err.message}`);
  }

  // Try to query list and ensure the filter is $and merged securely
  console.log('\n2. Verifying list filter security ($and scoping)...');
  const listData = await buildQuery({
    role: employeeRole._id.toString(),
    userId: testEmployeeId.toString(),
    action: 'read',
    modelName: 'attendances',
    filter: {
      date: { $gte: `${todayStr}T00:00:00.000Z`, $lte: `${todayStr}T23:59:59.999Z` }
    }
  });

  const allMatch = listData.every(r => r.employee.toString() === testEmployeeId.toString());
  if (allMatch) {
    console.log(`✓ Secure: List query returned ${listData.length} records, all strictly belonging to testEmployeeId.`);
  } else {
    console.log('❌ FAILED: List query leaked records belonging to other users!');
  }

  console.log('\n=========================================');
  console.log('🟡 RUNNING FLOW 3: EDGE CASES');
  console.log('=========================================');

  // Check invalid coordinates
  console.log('1. Testing validation rules...');
  try {
    await buildQuery({
      role: employeeRole._id.toString(),
      userId: testEmployeeId.toString(),
      action: 'create',
      modelName: 'attendances',
      body: {
        employee: '', // missing employee ID
        date: todayStr
      }
    });
    console.log('❌ FAILED: Invalid model payload was accepted!');
  } catch (err) {
    console.log(`✓ Rejected invalid payload (correct behavior): ${err.message}`);
  }

  // Clean up test data
  console.log('\n🗑️ Cleaning up test verification documents...');
  await models.attendances.deleteMany({ employee: { $in: [testEmployeeId, anotherEmployeeId] } });
  console.log('✓ Test data removed.');

  await mongoose.disconnect();
  console.log('\n🔌 MongoDB connection closed. Verification run completed.\n');
  return true;
}

// Support running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAttendanceLifecycle()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
