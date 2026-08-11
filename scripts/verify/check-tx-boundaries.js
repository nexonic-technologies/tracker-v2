import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const SERVICES_DIR = path.resolve(ROOT_DIR, 'Backend/src/services');

function parseBeforeHooks(content) {
  const hooks = [];
  // Match beforeCreate: async (ctx) => { ... } or beforeCreate: async function (ctx) { ... }
  // or beforeCreate(ctx) { ... }
  const hookRegex = /\b(beforeCreate|beforeUpdate|beforeDelete)\s*[:(][\s\S]*?\{/g;
  let match;
  while ((match = hookRegex.exec(content)) !== null) {
    const hookName = match[1];
    const startIndex = hookRegex.lastIndex - 1; // '{'
    
    let braceCount = 1;
    let i = startIndex + 1;
    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') braceCount--;
      i++;
    }
    if (braceCount === 0) {
      const body = content.slice(startIndex, i);
      hooks.push({ hookName, body, index: startIndex });
    }
  }
  return hooks;
}

function checkTxBoundaries() {
  console.log('=== Starting Transaction Boundaries & Side Effects Audit ===');
  
  if (!fs.existsSync(SERVICES_DIR)) {
    console.error(`Services directory not found: ${SERVICES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SERVICES_DIR);
  let warnings = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(SERVICES_DIR, file);
    if (fs.statSync(filePath).isFile() && file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const beforeHooks = parseBeforeHooks(content);

      beforeHooks.forEach(hook => {
        // 1. Check for notification side-effects in pre-hooks
        const notificationKeywords = [
          'sendNotification',
          'fcmService',
          'sendPush',
          'nodemailer',
          'sendMail',
          'asyncNotificationService',
          'notificationService',
          'dynamicNotificationDispatcher'
        ];
        
        notificationKeywords.forEach(kw => {
          if (hook.body.includes(kw)) {
            console.error(`🔴 Blocker: Notification side effect using "${kw}" found inside pre-commit hook "${hook.hookName}" in "${file}". Move to an after-hook.`);
            errors++;
          }
        });

        // 2. Check for database writes to other collections in pre-hooks
        // e.g. Model.create, Model.insertMany, models.X.create, etc.
        const dbWriteRegex = /\b([a-zA-Z0-9_.]+)\.(create|save|update|updateMany|updateOne|findOneAndUpdate|insertMany|deleteMany|deleteOne|findOneAndDelete)\b/g;
        let dbMatch;
        while ((dbMatch = dbWriteRegex.exec(hook.body)) !== null) {
          const varName = dbMatch[1];
          const method = dbMatch[2];
          
          // Ignore mongoose/collection setup, or schema calls if any
          if (varName === 'schema' || varName === 'Schema') continue;

          console.error(`🔴 Blocker: Database write operation "${varName}.${method}" found inside pre-commit hook "${hook.hookName}" in "${file}". Write side-effects must execute post-commit in an after-hook.`);
          errors++;
        }
      });
    }
  }

  if (errors === 0) {
    console.log(`✅ PASS: All service side-effects are properly aligned with transaction boundaries.`);
  } else {
    console.error(`❌ FAILED: ${errors} side-effect boundary issues found.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

checkTxBoundaries();
