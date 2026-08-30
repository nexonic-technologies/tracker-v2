import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODULE_DEFINITIONS } from '../src/models/tenantRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICES_DIR = path.resolve(__dirname, '../src/services');

// Collect all official canonical collection names from tenantRegistry modules
const allTenantModels = new Set();
for (const moduleKey of Object.keys(MODULE_DEFINITIONS)) {
  for (const modelName of MODULE_DEFINITIONS[moduleKey]) {
    allTenantModels.add(modelName);
  }
}

// Explicit Canonical Name Mapping for standard ERP collections
const EXPLICIT_CANONICAL_MAP = {
  assetallocations: 'asset_allocations',
  asset_allocations: 'asset_allocations',
  assets_allocations: 'asset_allocations',

  assetcategories: 'asset_categories',
  asset_categories: 'asset_categories',
  assets_categories: 'asset_categories',

  assetincidents: 'asset_incidents',
  asset_incidents: 'asset_incidents',
  assets_incidents: 'asset_incidents',

  assetpayments: 'asset_payments',
  asset_payments: 'asset_payments',
  assets_payments: 'asset_payments',

  assetpurchases: 'asset_purchases',
  asset_purchases: 'asset_purchases',
  assets_purchases: 'asset_purchases',

  assetrepairs: 'asset_repairs',
  asset_repairs: 'asset_repairs',
  assets_repairs: 'asset_repairs',

  attendancepolicies: 'attendance_policies',
  attendance_policies: 'attendance_policies',

  clientledgers: 'client_ledgers',
  client_ledgers: 'client_ledgers',
  clients_ledgers: 'client_ledgers',

  commentsthreads: 'comments_threads',
  comments_threads: 'comments_threads',

  companies: 'company',
  company: 'company',

  compoffrequests: 'comp_off_requests',
  comp_off_requests: 'comp_off_requests',

  crmmeetings: 'crm_meetings',
  crm_meetings: 'crm_meetings',

  dailyactivities: 'daily_activities',
  daily_activities: 'daily_activities',

  employeelifecyclehistories: 'employee_lifecycle_histories',
  employee_lifecycle_histories: 'employee_lifecycle_histories',

  employeetaskqueues: 'employee_task_queues',
  employee_task_queues: 'employee_task_queues',

  employeetaskqueuerequests: 'employee_task_queue_requests',
  employee_task_queue_requests: 'employee_task_queue_requests',

  feedchannels: 'feed_channels',
  feed_channels: 'feed_channels',

  feedcomments: 'feed_comments',
  feed_comments: 'feed_comments',

  feedgroups: 'feed_groups',
  feed_groups: 'feed_groups',

  feedposts: 'feed_posts',
  feed_posts: 'feed_posts',

  generalsettings: 'general_settings',
  general_settings: 'general_settings',

  jobcategories: 'job_categories',
  job_categories: 'job_categories',

  jobopenings: 'job_openings',
  job_openings: 'job_openings',

  jobtypes: 'job_types',
  job_types: 'job_types',

  leavepolicy: 'leave_policy',
  leave_policy: 'leave_policy',
  leavepolicies: 'leave_policy',
  leave_policies: 'leave_policy',

  notificationrules: 'notification_rules',
  notification_rules: 'notification_rules',

  orderacknowledgements: 'order_acknowledgements',
  order_acknowledgements: 'order_acknowledgements',
  orderacknowledgments: 'order_acknowledgements',
  order_acknowledgments: 'order_acknowledgements',

  paymentjournals: 'payment_journals',
  payment_journals: 'payment_journals',

  payrollruns: 'payroll_runs',
  payroll_runs: 'payroll_runs',

  periodclosures: 'period_closures',
  period_closures: 'period_closures',

  salarystructures: 'salary_structures',
  salary_structures: 'salary_structures',

  teammessages: 'team_messages',
  team_messages: 'team_messages',

  timetrackersessions: 'time_tracker_sessions',
  time_tracker_sessions: 'time_tracker_sessions',

  wfhrequests: 'wfh_requests',
  wfh_requests: 'wfh_requests',
};

// Inverted map: find canonical snake_case name for any stripped/alias form
function getCanonicalSnakeCase(filenameBase) {
  const stripped = filenameBase.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (EXPLICIT_CANONICAL_MAP[stripped]) {
    return EXPLICIT_CANONICAL_MAP[stripped];
  }
  if (EXPLICIT_CANONICAL_MAP[filenameBase.toLowerCase()]) {
    return EXPLICIT_CANONICAL_MAP[filenameBase.toLowerCase()];
  }

  // 1. Direct match with tenant registry models
  for (const model of allTenantModels) {
    if (model.toLowerCase().replace(/[^a-z0-9]/g, '') === stripped) {
      return model;
    }
  }

  // 2. Singular / Plural match with tenant registry models
  for (const model of allTenantModels) {
    const s1 = model.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s1 === `${stripped}s` || `${s1}s` === stripped) {
      return model;
    }
  }

  return null;
}

// Special overrides for non-entity utilities or specific service files
const EXEMPT_FILES = new Set([
  'aiSummarizer.js',
  'gitService.js',
]);

export function alignServices({ dryRun = false } = {}) {
  console.log(`\n--- Aligning Backend Services to Canonical Model Names ${dryRun ? '(DRY RUN)' : ''} ---\n`);

  if (!fs.existsSync(SERVICES_DIR)) {
    console.error(`Services directory not found: ${SERVICES_DIR}`);
    return;
  }

  const files = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js'));
  let renamedCount = 0;
  let skippedCount = 0;
  let deletedDuplicatesCount = 0;

  for (const file of files) {
    if (EXEMPT_FILES.has(file)) {
      console.log(`[EXEMPT] Skipping utility file: ${file}`);
      skippedCount++;
      continue;
    }

    const currentBase = path.basename(file, '.js');
    const canonical = getCanonicalSnakeCase(currentBase);

    if (!canonical) {
      console.log(`[NO_CANONICAL] No canonical match found for: ${file} (keeping as is)`);
      skippedCount++;
      continue;
    }

    const targetFile = `${canonical}.js`;
    const currentPath = path.join(SERVICES_DIR, file);
    const targetPath = path.join(SERVICES_DIR, targetFile);

    if (file === targetFile) {
      console.log(`[OK] Already aligned: ${file}`);
      continue;
    }

    // Check if targetFile already exists
    if (fs.existsSync(targetPath)) {
      const currentStats = fs.statSync(currentPath);
      const targetStats = fs.statSync(targetPath);

      // If the target file is larger/more complete or already has content, remove the non-canonical duplicate
      if (targetStats.size >= currentStats.size) {
        console.log(`[CLEANUP] Removing redundant duplicate ${file} (target ${targetFile} already exists and is primary)`);
        if (!dryRun) {
          fs.unlinkSync(currentPath);
        }
        deletedDuplicatesCount++;
      } else {
        console.log(`[REPLACE] Replacing smaller ${targetFile} with fuller content from ${file}`);
        if (!dryRun) {
          fs.unlinkSync(targetPath);
          fs.renameSync(currentPath, targetPath);
        }
        renamedCount++;
      }
    } else {
      console.log(`[RENAME] ${file} -> ${targetFile}`);
      if (!dryRun) {
        fs.renameSync(currentPath, targetPath);
      }
      renamedCount++;
    }
  }

  console.log(`\nAlignment Summary:`);
  console.log(`- Renamed / Migrated: ${renamedCount}`);
  console.log(`- Removed Duplicate Stubs: ${deletedDuplicatesCount}`);
  console.log(`- Skipped / Already Aligned: ${skippedCount}`);
}

// Execute directly if run via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isDryRun = process.argv.includes('--dry-run');
  alignServices({ dryRun: isDryRun });
}
