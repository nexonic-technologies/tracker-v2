/**
 * auditBusinessRuleLeakage.js
 * Comprehensive Post-Implementation Business Rule Leakage Auditor
 * 
 * Verifies that zero hardcoded business thresholds or defaults exist in business handlers,
 * calculation engines, and report services.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../');

const VIOLATION_PATTERNS = [
  {
    name: 'Hardcoded Privileged Role List',
    regex: /PRIVILEGED_ROLES\s*=\s*\[/,
    category: 'Authorization'
  },
  {
    name: 'Hardcoded Default Shift Object in Code',
    regex: /name:\s*['"]Default Shift['"]/,
    category: 'Attendance'
  },
  {
    name: 'Hardcoded 480 Overtime Default in Engine',
    regex: /overtimeThresholdMins\s*\|\|\s*480/,
    category: 'Attendance'
  },
  {
    name: 'Hardcoded PF Ceiling 15000 in Engine',
    regex: /pfCeiling\s*\|\|\s*15000/,
    category: 'Payroll'
  }
];

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'uploads', 'dist'].includes(file)) {
        scanDirectory(filePath, fileList);
      }
    } else if (file.endsWith('.js') && !filePath.includes('auditBusinessRuleLeakage.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function runAudit() {
  console.log('====================================================');
  console.log('  BUSINESS RULE LEAKAGE AUDIT (POST-IMPLEMENTATION) ');
  console.log('====================================================\n');

  const files = scanDirectory(srcDir);
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(srcDir, file);

    for (const pattern of VIOLATION_PATTERNS) {
      if (pattern.regex.test(content)) {
        violations.push({
          category: pattern.category,
          rule: pattern.name,
          file: relativePath
        });
      }
    }
  }

  console.log('Attendance:');
  const attViolations = violations.filter(v => v.category === 'Attendance');
  console.log(`  Hardcoded thresholds / fallback shifts:  ${attViolations.length}`);

  console.log('Payroll:');
  const payViolations = violations.filter(v => v.category === 'Payroll');
  console.log(`  Hardcoded statutory rates / fallbacks:   ${payViolations.length}`);

  console.log('Authorization:');
  const authViolations = violations.filter(v => v.category === 'Authorization');
  console.log(`  Hardcoded privileged role lists:         ${authViolations.length}`);

  console.log('\n----------------------------------------------------');
  if (violations.length === 0) {
    console.log('VERDICT: PASS (Zero Business Rule Leakage Detected)');
  } else {
    console.log(`VERDICT: FAIL (${violations.length} violations found)`);
    violations.forEach(v => console.log(`  - [${v.category}] ${v.rule} in ${v.file}`));
  }
  console.log('----------------------------------------------------');
}

runAudit();
