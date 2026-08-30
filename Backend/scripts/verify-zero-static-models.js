import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_SRC = path.resolve(__dirname, '../src');

// Direct imports of these global control-plane models and dynamic proxies are allowed:
const ALLOWED_GLOBAL_IMPORTS = new Set([
  'models/global/index.js',
  'models/global/Tenant.js',
  'models/global/UserLogin.js',
  'models/global/Module.js',
  'models/global/ModelDefinition.js',
  'models/tenantRegistry.js',
  'models/Collection.js',
]);

const DIRS_TO_SCAN = [
  path.join(BACKEND_SRC, 'services'),
  path.join(BACKEND_SRC, 'utils'),
  path.join(BACKEND_SRC, 'engine'),
  path.join(BACKEND_SRC, 'Controller'),
  path.join(BACKEND_SRC, 'middlewares'),
  path.join(BACKEND_SRC, 'routes'),
];

function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log('🔍 [Verification] Checking for forbidden static tenant model imports in Backend/src...\n');

let violations = [];
let totalFilesScanned = 0;

for (const targetDir of DIRS_TO_SCAN) {
  const files = getAllFiles(targetDir);
  for (const filePath of files) {
    totalFilesScanned++;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Check for direct import of static tenant Mongoose schema models (e.g. import Employee from "../models/Employee.js")
      const importMatch = line.match(/^import\s+.*\s+from\s+['"](.*models\/[^'"]+)['"]/);
      if (importMatch) {
        const importPath = importMatch[1];
        const isAllowed = Array.from(ALLOWED_GLOBAL_IMPORTS).some(allowed => importPath.endsWith(allowed));
        if (!isAllowed && !importPath.includes('models/global')) {
          violations.push({
            file: path.relative(BACKEND_SRC, filePath),
            line: idx + 1,
            rule: 'Forbidden direct static import of tenant model',
            code: line.trim(),
          });
        }
      }
    });
  }
}

console.log(`Scanned ${totalFilesScanned} files.`);

if (violations.length > 0) {
  console.error(`\n❌ [FAILURE] Found ${violations.length} static model import violations:\n`);
  violations.forEach((v, i) => {
    console.error(`${i + 1}. ${v.file}:${v.line}`);
    console.error(`   Rule: ${v.rule}`);
    console.error(`   Snippet: ${v.code}\n`);
  });
  process.exit(1);
} else {
  console.log('\n✅ [PASSED] Zero static tenant model imports found! All backend modules resolve models dynamically via tenantContext.getModel().');
  process.exit(0);
}
