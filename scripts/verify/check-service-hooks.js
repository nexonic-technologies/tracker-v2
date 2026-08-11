import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const SERVICES_DIR = path.resolve(ROOT_DIR, 'Backend/src/services');
const VALID_HOOKS = ['beforeCreate', 'afterCreate', 'beforeRead', 'afterRead', 'beforeUpdate', 'afterUpdate', 'beforeDelete', 'afterDelete'];

async function checkServiceHooks() {
  console.log('=== Starting Service Hooks Interface Check ===');
  if (!fs.existsSync(SERVICES_DIR)) {
    console.error(`Services directory not found: ${SERVICES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SERVICES_DIR);
  let warnings = 0;
  let errors = 0;
  let modelServicesCount = 0;
  let utilityServicesCount = 0;

  for (const file of files) {
    if (!file.endsWith('.js') || fs.statSync(path.join(SERVICES_DIR, file)).isDirectory()) {
      continue;
    }

    try {
      const modulePath = path.join(SERVICES_DIR, file);
      const serviceModule = await import(`file://${modulePath}`);
      const factory = serviceModule.default;

      let isFactory = typeof factory === 'function';
      let hooks = null;

      if (isFactory) {
        try {
          hooks = factory();
        } catch {
          // If invoking factory() fails (e.g. class constructor requiring 'new'), treat as utility class
          isFactory = false;
        }
      }

      const hookKeys = (hooks && typeof hooks === 'object') ? Object.keys(hooks) : [];
      const declaredHooks = hookKeys.filter(k => VALID_HOOKS.includes(k));

      // Determine if file is a Populate Engine model hook service or a platform utility service
      const isModelHookService = isFactory && declaredHooks.length > 0;

      if (isModelHookService) {
        modelServicesCount++;
        const invalidKeys = hookKeys.filter(k => !VALID_HOOKS.includes(k));
        if (invalidKeys.length > 0) {
          console.warn(`🟠 Warning: Model service "${file}" has non-standard helper exports alongside hooks: ${invalidKeys.join(', ')}`);
          warnings++;
        }
        console.log(`✓ Model Service "${file}" valid hooks: [${declaredHooks.join(', ')}]`);
      } else {
        utilityServicesCount++;
        console.log(`✓ Platform Utility Service "${file}" (Utility/Helper module)`);
      }
    } catch (err) {
      console.error(`🔴 Blocker: Failed to import service ${file}:`, err.message);
      errors++;
    }
  }

  console.log(`\nSummary: ${modelServicesCount} Model Services, ${utilityServicesCount} Utility Services verified.`);

  if (errors === 0) {
    console.log(`✅ PASS: Service hooks parsed successfully. Warnings: ${warnings}`);
  } else {
    console.error(`❌ FAILED: ${errors} services failed compliance checks.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

checkServiceHooks();
