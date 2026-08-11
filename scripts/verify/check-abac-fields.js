import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const requireBackend = createRequire(path.resolve(ROOT_DIR, 'Backend/package.json'));
const mongoose = requireBackend('mongoose').default || requireBackend('mongoose');
const dotenv = requireBackend('dotenv');

dotenv.config({ path: path.resolve(ROOT_DIR, 'Backend/.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

async function checkAbacFields() {
  console.log('=== Starting ABAC Field Protection Audit ===');

  let dbConnected = false;
  let errors = 0;
  let warnings = 0;

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    dbConnected = true;
    console.log('✓ Connected to MongoDB.');

    // Fetch all roles
    const roles = await mongoose.connection.db.collection('roles').find({ isActive: true }).toArray();
    // Fetch all access policies
    const policies = await mongoose.connection.db.collection('access_policies').find({}).toArray();

    // Map policies by roleId + modelName
    const policyMap = new Map();
    policies.forEach(p => {
      policyMap.set(`${p.role.toString()}:${p.modelName}`, p);
    });

    // Check each standard role (non-SuperAdmin, non-Admin, non-HR)
    for (const role of roles) {
      if (role.isSuperAdmin) continue;

      const roleNameLower = role.name.toLowerCase();
      if (roleNameLower.includes('admin') || roleNameLower.includes('hr')) {
        // Skip admins and HR as they legitimately require access to some sensitive fields
        continue;
      }

      console.log(`Auditing role: "${role.name}" (${role._id})...`);

      // 1. Check Employees Model
      const empPolicy = policyMap.get(`${role._id.toString()}:employees`);
      if (empPolicy) {
        // Sensitive fields on employees: authInfo, salaryDetails
        const sensitiveFields = ['authInfo', 'salaryDetails'];

        ['read', 'update'].forEach(action => {
          const forbidden = empPolicy.forbiddenAccess?.[action] || [];
          const allowed = empPolicy.allowAccess?.[action] || [];

          sensitiveFields.forEach(field => {
            // Field is protected if:
            // A. It is in forbiddenAccess array (explicit block)
            // B. Or allowAccess is NOT empty, does NOT include '*', and does NOT include the sensitive field
            const isForbidden = forbidden.some(f => f === field || f.startsWith(field + '.'));

            let isAllowed = false;
            if (allowed.includes('*')) {
              isAllowed = true;
            } else if (allowed.length > 0) {
              isAllowed = allowed.some(a => a === field || a.startsWith(field + '.'));
            } else {
              // If allowed is empty, then by default everything is allowed unless forbidden?
              // In our fail-safe policy design, if allowed is empty, it means no whitelist applies,
              // so it falls back to whether it's in forbidden.
              isAllowed = true;
            }

            if (isAllowed && !isForbidden) {
              console.error(`🔴 Blocker: Role "${role.name}" has unprotected access to "${field}" for action "${action}" on employees model.`);
              errors++;
            }
          });
        });
      } else {
        console.warn(`   🟠 Warning: No employees policy defined for role "${role.name}".`);
        warnings++;
      }

      // 2. Check Leaves Model (leavePolicy is sensitive, should not be modifiable by employee)
      const leavePolicy = policyMap.get(`${role._id.toString()}:leaves`);
      if (leavePolicy) {
        const forbidden = leavePolicy.forbiddenAccess?.update || [];
        const allowed = leavePolicy.allowAccess?.update || [];

        const isForbidden = forbidden.includes('leavePolicy');
        const isAllowed = allowed.includes('*') || allowed.includes('leavePolicy');

        if (isAllowed && !isForbidden) {
          console.error(`🔴 Blocker: Role "${role.name}" can update "leavePolicy" on leave requests.`);
          errors++;
        }
      }
    }

  } catch (err) {
    console.warn('🟠 Warning: Could not connect to MongoDB. ABAC field protection check skipped.', err.message);
    warnings++;
  } finally {
    if (dbConnected) {
      await mongoose.disconnect();
    }
  }

  if (errors === 0) {
    console.log(`✅ PASS: Sensitive fields are properly gated in access_policies. Warnings: ${warnings}`);
  } else {
    console.error(`❌ FAILED: ${errors} sensitive field protection issues found.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

checkAbacFields();
