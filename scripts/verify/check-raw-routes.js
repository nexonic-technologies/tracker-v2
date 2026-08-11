import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const ROUTES_DIR = path.resolve(ROOT_DIR, 'Backend/src/routes');

const ALLOWED_RAW_ROUTES = [
  'agentAuth.js',
  'agentInviteRoutes.js',
  'agentRoutes.js',
  'adminSystemRoutes.js',
  'authRoutes.js',
  'bankRoutes.js',
  'configRoutes.js',
  'cronRoutes.js',
  'dashboardRoutes.js',
  'exportRoutes.js',
  'fileRoutes.js',
  'ganttRoutes.js',
  'locationRoutes.js',
  'periodClosureRoutes.js',
  'populateRoutes.js',
  'reportRoutes.js',
  'searchRoutes.js'
];

function checkRawRoutes() {
  console.log('=== Starting Raw Handlers Triage ===');
  if (!fs.existsSync(ROUTES_DIR)) {
    console.error(`Routes directory not found: ${ROUTES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ROUTES_DIR);
  let errors = 0;

  files.forEach(file => {
    if (file.endsWith('.js') && !ALLOWED_RAW_ROUTES.includes(file)) {
      console.error(`🔴 Blocker: Raw handler file found: ${file}. Custom controllers must be registered as service hooks.`);
      errors++;
    }
  });

  if (errors === 0) {
    console.log('✅ PASS: No unauthorized raw routes found.');
  } else {
    console.error(`❌ FAILED: ${errors} raw route issues found.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

checkRawRoutes();
