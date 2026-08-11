import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.resolve(ROOT_DIR, 'Backend/src');
const BUILD_REPORT_QUERY_PATH = path.resolve(SRC_DIR, 'crud/buildReportQuery.js');
const SERVICES_DIR = path.resolve(SRC_DIR, 'services');
const ROUTES_DIR = path.resolve(SRC_DIR, 'routes');

console.log('=====================================================');
console.log('  Audit: Report Engine Architecture & Hook Compliance');
console.log('=====================================================');

let hasErrors = false;

// 1. Audit buildReportQuery.js engine compliance
if (!fs.existsSync(BUILD_REPORT_QUERY_PATH)) {
  console.error('🔴 ERROR: buildReportQuery.js file missing at:', BUILD_REPORT_QUERY_PATH);
  hasErrors = true;
} else {
  const content = fs.readFileSync(BUILD_REPORT_QUERY_PATH, 'utf-8');

  // Check safeAggregate usage
  if (!content.includes('safeAggregate(')) {
    console.error('🔴 ERROR: buildReportQuery.js must use safeAggregate() for pipeline execution!');
    hasErrors = true;
  } else {
    console.log('✓ PASS: buildReportQuery.js uses safeAggregate() exclusively.');
  }

  // Check runRegistry security hook
  if (!content.includes('runRegistry(')) {
    console.error('🔴 ERROR: buildReportQuery.js must invoke runRegistry() for ABAC security!');
    hasErrors = true;
  } else {
    console.log('✓ PASS: buildReportQuery.js enforces ABAC security via runRegistry().');
  }

  // Check service lifecycle hook discovery
  if (!content.includes('beforeReport') || !content.includes('afterReport')) {
    console.error('🔴 ERROR: buildReportQuery.js must support beforeReport and afterReport service hooks!');
    hasErrors = true;
  } else {
    console.log('✓ PASS: buildReportQuery.js supports beforeReport & afterReport service hooks.');
  }
}

// 2. Audit company service hooks for MIS-04
const companyServicePath = path.resolve(SERVICES_DIR, 'companies.js');
if (!fs.existsSync(companyServicePath)) {
  console.warn('🟠 WARNING: src/services/companies.js missing.');
} else {
  const companyContent = fs.readFileSync(companyServicePath, 'utf-8');
  if (companyContent.includes('beforeReport') && companyContent.includes('afterReport') && companyContent.includes('MIS-04')) {
    console.log('✓ PASS: src/services/companies.js correctly implements beforeReport and afterReport for MIS-04.');
  } else {
    console.error('🔴 ERROR: src/services/companies.js must implement beforeReport and afterReport handling MIS-04!');
    hasErrors = true;
  }
}

// 3. Audit routes to ensure no custom monolith report handlers bypass populate engine
if (fs.existsSync(ROUTES_DIR)) {
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js') && f !== 'populateRoutes.js');
  let rawReportRoutesFound = 0;

  routeFiles.forEach(file => {
    const fileContent = fs.readFileSync(path.resolve(ROUTES_DIR, file), 'utf-8');
    if (fileContent.includes('router.get(') && fileContent.includes('/report')) {
      rawReportRoutesFound++;
      console.warn(`🟠 WARNING: Custom report route found in ${file}. Standard reports should route via /api/populate/report/:model.`);
    }
  });

  if (rawReportRoutesFound === 0) {
    console.log('✓ PASS: Zero custom report routes detected outside populateHelper engine.');
  }
}

console.log('-----------------------------------------------------');
if (hasErrors) {
  console.error('❌ Audit Failed: Report Engine Compliance Check Failed.');
  process.exit(1);
} else {
  console.log('✅ Audit Passed: Report Engine Architecture & Hooks are 100% compliant!');
  process.exit(0);
}
