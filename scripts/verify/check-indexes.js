import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const INDEXER_FILE = path.resolve(ROOT_DIR, 'Backend/src/services/databaseIndexer.js');
const MODELS_DIR = path.resolve(ROOT_DIR, 'Backend/src/models');
const SERVICES_DIR = path.resolve(ROOT_DIR, 'Backend/src/services');
const ROUTES_DIR = path.resolve(ROOT_DIR, 'Backend/src/routes');

const MODEL_ALIAS_MAP = {
  'agent': 'agents',
  'agents': 'agents',
  'activitylog': 'activity_logs',
  'activity_logs': 'activity_logs',
  'asset': 'assets',
  'assets': 'assets',
  'assetallocation': 'assets_allocations',
  'assets_allocations': 'assets_allocations',
  'assetcategory': 'assets_categories',
  'assets_categories': 'assets_categories',
  'assetincident': 'assets_incidents',
  'assets_incidents': 'assets_incidents',
  'assetinvoice': 'assets_invoices',
  'assets_invoices': 'assets_invoices',
  'assetpayment': 'assets_payments',
  'assets_payments': 'assets_payments',
  'assetpurchase': 'assets_purchases',
  'assets_purchases': 'assets_purchases',
  'assetrepair': 'assets_repairs',
  'assets_repairs': 'assets_repairs',
  'attendance': 'attendances',
  'attendances': 'attendances',
  'attendancepolicy': 'attendance_policies',
  'attendance_policies': 'attendance_policies',
  'candidate': 'candidates',
  'candidates': 'candidates',
  'client': 'clients',
  'clients': 'clients',
  'clientledger': 'clients_ledgers',
  'clients_ledgers': 'clients_ledgers',
  'commentsthread': 'comments_threads',
  'comments_threads': 'comments_threads',
  'compoffrequest': 'comp_off_requests',
  'comp_off_requests': 'comp_off_requests',
  'contact': 'contacts',
  'contacts': 'contacts',
  'crmactivity': 'crm_activities',
  'crm_activities': 'crm_activities',
  'crmmeeting': 'crm_meetings',
  'crm_meetings': 'crm_meetings',
  'dailyactivity': 'daily_activities',
  'daily_activities': 'daily_activities',
  'department': 'departments',
  'departments': 'departments',
  'designation': 'designations',
  'designations': 'designations',
  'employee': 'employees',
  'employees': 'employees',
  'expense': 'expenses',
  'expenses': 'expenses',
  'feedchannel': 'feed_channels',
  'feed_channels': 'feed_channels',
  'feedcomment': 'feed_comments',
  'feed_comments': 'feed_comments',
  'feedgroup': 'feed_groups',
  'feed_groups': 'feed_groups',
  'feedpost': 'feed_posts',
  'feed_posts': 'feed_posts',
  'grant': 'grants',
  'grants': 'grants',
  'holiday': 'holidays',
  'holidays': 'holidays',
  'hr_policies': 'hrpolicies',
  'hrpolicies': 'hrpolicies',
  'jobcategory': 'job_categories',
  'job_categories': 'job_categories',
  'jobopening': 'job_openings',
  'job_openings': 'job_openings',
  'jobtype': 'job_types',
  'job_types': 'job_types',
  'leave': 'leaves',
  'leaves': 'leaves',
  'leavetype': 'leave_types',
  'leave_types': 'leave_types',
  'leavepolicy': 'leavepolicy',
  'notification': 'notifications',
  'notifications': 'notifications',
  'notificationreceptionist': 'notificationreceptionist',
  'onboarding': 'onboardings',
  'onboardings': 'onboardings',
  'onboardingtemplate': 'onboarding_templates',
  'onboarding_templates': 'onboarding_templates',
  'orderacknowledgment': 'orderacknowledgments',
  'orderacknowledgement': 'orderacknowledgments',
  'orderacknowledgments': 'orderacknowledgments',
  'order_acknowledgements': 'orderacknowledgments',
  'payroll': 'payrolls',
  'payrolls': 'payrolls',
  'payrollrun': 'payroll_runs',
  'payroll_runs': 'payroll_runs',
  'periodclosure': 'period_closures',
  'period_closures': 'period_closures',
  'product': 'products',
  'products': 'products',
  'projecttype': 'project_types',
  'project_types': 'project_types',
  'quotation': 'quotations',
  'quotations': 'quotations',
  'regularization': 'regularizations',
  'regularizations': 'regularizations',
  'role': 'roles',
  'roles': 'roles',
  'salarystructure': 'salary_structures',
  'salary_structures': 'salary_structures',
  'session': 'sessions',
  'sessions': 'sessions',
  'time_tracker_session': 'sessions',
  'time_tracker_sessions': 'sessions',
  'shift': 'shifts',
  'shifts': 'shifts',
  'shiftassignment': 'shiftassignments',
  'shiftassignments': 'shiftassignments',
  'sidebar': 'sidebars',
  'sidebars': 'sidebars',
  'sprint': 'sprints',
  'sprints': 'sprints',
  'status_configs': 'status_configss',
  'status_configss': 'status_configss',
  'status_mapping': 'status_mappings',
  'status_mappings': 'status_mappings',
  'task': 'tasks',
  'tasks': 'tasks',
  'tasktype': 'task_types',
  'task_types': 'task_types',
  'ticket': 'tickets',
  'tickets': 'tickets',
  'ticket_participant': 'ticket_participants',
  'ticket_participants': 'ticket_participants',
  'ticket_comment_read': 'ticket_comment_reads',
  'ticket_comment_reads': 'ticket_comment_reads',
  'ticket_status_history': 'ticket_status_history',
  'todo': 'todos',
  'todos': 'todos',
  'wfhrequest': 'wfh_requests',
  'wfh_requests': 'wfh_requests',
  'workflow': 'workflows',
  'workflows': 'workflows'
};

const IGNORED_KEYS = new Set([
  'gte', 'gt', 'lte', 'lt', 'ne', 'in', 'nin', 'or', 'and', 'nor', 'not',
  'exists', 'regex', 'options', 'elemMatch', 'all', 'size', 'type', 'mod',
  'where', 'slice', 'meta', 'select', 'sort', 'limit', 'skip', 'lean',
  'populate', 'set', 'push', 'pull', 'inc', 'unset', 'T00', 'T23', '$status',
  '$gte', '$lte', '$in', '$nin', '$ne', '$or', '$and', '$nor', '$not'
]);

function resolveModelFromVar(varName) {
  const clean = varName.replace(/^models\./, '').replace(/^model\./, '').toLowerCase();
  return MODEL_ALIAS_MAP[clean] || clean;
}

function parseIndexesFromModelsAndIndexer() {
  const indexMap = new Map();

  function addIndex(modelName, fields) {
    const canonical = resolveModelFromVar(modelName);
    if (!indexMap.has(canonical)) {
      indexMap.set(canonical, []);
    }
    indexMap.get(canonical).push(fields);
  }

  // 1. Parse databaseIndexer.js
  if (fs.existsSync(INDEXER_FILE)) {
    const content = fs.readFileSync(INDEXER_FILE, 'utf8');
    const regex = /indexModel\(\s*['"]([^'"]+)['"]\s*,\s*\[([\s\S]*?)\]\s*\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const modelName = match[1];
      const arrayContent = match[2];
      const objRegex = /\{([\s\S]*?)\}/g;
      let objMatch;
      while ((objMatch = objRegex.exec(arrayContent)) !== null) {
        const fieldsStr = objMatch[1];
        const fields = [];
        const fieldRegex = /['"]?([a-zA-Z0-9_.-]+)['"]?\s*:/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
          fields.push(fieldMatch[1]);
        }
        if (fields.length > 0) {
          addIndex(modelName, fields);
        }
      }
    }
  }

  // 2. Parse Mongoose Model Files (Backend/src/models/*.js)
  if (fs.existsSync(MODELS_DIR)) {
    const files = fs.readdirSync(MODELS_DIR);
    files.forEach(file => {
      if (!file.endsWith('.js')) return;
      const content = fs.readFileSync(path.join(MODELS_DIR, file), 'utf8');

      let collectionName = path.basename(file, '.js').toLowerCase();
      const modelExportMatch = content.match(/model\(\s*['"]([^'"]+)['"]/);
      if (modelExportMatch) {
        collectionName = modelExportMatch[1];
      }

      // Parse Schema.index({ field1: 1, field2: -1 })
      const schemaIndexRegex = /\.index\(\s*\{([\s\S]*?)\}/g;
      let idxMatch;
      while ((idxMatch = schemaIndexRegex.exec(content)) !== null) {
        const fieldsStr = idxMatch[1];
        const fields = [];
        const fieldRegex = /['"]?([a-zA-Z0-9_.-]+)['"]?\s*:/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
          fields.push(fieldMatch[1]);
        }
        if (fields.length > 0) {
          addIndex(collectionName, fields);
        }
      }

      // Parse field inline { index: true } or { unique: true }
      const inlineIndexRegex = /([a-zA-Z0-9_.]+)\s*:\s*\{[^}]*?\b(index|unique)\s*:\s*true/g;
      let inlineMatch;
      while ((inlineMatch = inlineIndexRegex.exec(content)) !== null) {
        const fieldName = inlineMatch[1];
        addIndex(collectionName, [fieldName]);
      }
    });
  }

  return indexMap;
}

function extractQueries(content) {
  const queries = [];
  const regex = /\b([a-zA-Z0-9_.]+)\.(find|findOne|findOneAndUpdate|updateOne|updateMany|deleteMany|countDocuments|findOneAndDelete|deleteOne)\s*\(\s*\{/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const modelVar = match[1];
    const method = match[2];
    const startIndex = regex.lastIndex - 1;

    let braceCount = 1;
    let i = startIndex + 1;
    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') braceCount--;
      i++;
    }
    if (braceCount === 0) {
      const objStr = content.slice(startIndex, i);
      queries.push({ modelVar, method, objStr });
    }
  }
  return queries;
}

function extractAllKeys(objStr) {
  const keys = new Set();
  const regex = /['"]?([a-zA-Z0-9_.-]+)['"]?\s*:/g;
  let match;
  while ((match = regex.exec(objStr)) !== null) {
    const key = match[1];
    if (!key.startsWith('$') && isNaN(Number(key)) && !IGNORED_KEYS.has(key)) {
      keys.add(key);
    }
  }
  return Array.from(keys);
}

function checkIndexes() {
  console.log('=== Starting Database Index Audit ===');
  const indexMap = parseIndexesFromModelsAndIndexer();

  if (indexMap.size === 0) {
    console.error('🔴 Blocker: No database indexes parsed from models or databaseIndexer.js');
    process.exit(1);
  }

  console.log(`Parsed index configurations for ${indexMap.size} models.`);

  const scanDirs = [SERVICES_DIR, ROUTES_DIR];
  let warnings = 0;
  let errors = 0;

  scanDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isFile() && file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const queries = extractQueries(content);

        queries.forEach(q => {
          const modelName = resolveModelFromVar(q.modelVar);
          const filterKeys = extractAllKeys(q.objStr);

          if (filterKeys.length === 0) return;

          const modelIndexes = indexMap.get(modelName);

          if (!modelIndexes) {
            const standardIgnored = ['access_policies', 'capabilities', 'roles', 'general_settings'];
            if (!standardIgnored.includes(modelName)) {
              console.warn(`🟠 Warning: No index definitions found for model "${modelName}" (queried in ${file} via "${q.modelVar}.${q.method}").`);
              warnings++;
            }
            return;
          }

          filterKeys.forEach(key => {
            if (key === '_id' || key === 'id') return;

            const isIndexed = modelIndexes.some(idx => idx[0] === key);

            if (!isIndexed) {
              console.warn(`🟠 Warning: Query filter field "${key}" in ${file} on model "${modelName}" is NOT the prefix of any index! Potential collection scan.`);
              warnings++;
            }
          });
        });
      }
    });
  });

  if (errors === 0) {
    console.log(`✅ PASS: Database index coverage audit complete. Warnings: ${warnings}`);
  } else {
    console.error(`❌ FAILED: ${errors} index issues found.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

checkIndexes();
