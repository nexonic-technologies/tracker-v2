import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERIFY_SCRIPTS = [
  'check-raw-routes.js',
  'check-service-hooks.js',
  'check-status-transitions.js',
  'check-indexes.js',
  'check-tx-boundaries.js',
  'check-abac-fields.js',
  'check-report-engine.js'
];

const args = process.argv.slice(2);
const modelArg = args.find(arg => arg.startsWith('--model='));
const isSystem = args.includes('--system') || args.includes('--coverage') || !modelArg;

const scriptsDir = __dirname;

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running verification script: ${scriptName}`);
    
    // Pass args down to individual scripts
    const child = fork(path.join(scriptsDir, scriptName), args);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptName} exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function runAll() {
  console.log('=============================================');
  console.log(`  Tracker Code Compliance Suite (Runner)     `);
  console.log(`  Scope: ${isSystem ? 'SYSTEM-WIDE' : modelArg} `);
  console.log('=============================================');

  try {
    for (const script of VERIFY_SCRIPTS) {
      await runScript(script);
    }
    console.log('\n=============================================');
    console.log('✅ SUCCESS: All verification audits passed!');
    console.log('=============================================');
    process.exit(0);
  } catch (err) {
    console.error('\n=============================================');
    console.error(`❌ FAILED: Verification suite failed.`);
    console.error(err.message);
    console.error('=============================================');
    process.exit(1);
  }
}

runAll();
