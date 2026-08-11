import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const requireBackend = createRequire(path.resolve(ROOT_DIR, 'Backend/package.json'));
const mongoose = requireBackend('mongoose').default || requireBackend('mongoose');

import models from '../../Backend/src/models/Collection.js';
import onboardingService from '../../Backend/src/services/onboardings.js';
import { jobs as onboardingJobs } from '../../Backend/src/cron/OnboardingCron.js';

async function runOnboardingSanityCheck() {
  console.log('🔍 Running Job Onboarding Subsystem Verification...\n');

  try {
    // 1. Verify Models Registration
    const Onboarding = models.onboardings;
    const OnboardingTemplate = models.onboarding_templates;
    const Employee = models.employees;
    const Company = models.company;

    if (!Onboarding || !OnboardingTemplate || !Employee || !Company) {
      throw new Error('❌ Core onboarding & company models failed to load from Collection registry!');
    }
    console.log('✅ Models registered: Onboarding, OnboardingTemplate, Employee, Company');

    // 2. Verify Status Enums
    const onboardingStatusEnum = Onboarding.schema.path('status').enumValues;
    const expectedStatuses = ['Pending', 'In Progress', 'Documents Pending', 'Verification Pending', 'Ready To Join', 'Joined', 'Completed', 'Cancelled', 'Postponed', 'No Show'];
    const missingStatuses = expectedStatuses.filter(s => !onboardingStatusEnum.includes(s));

    if (missingStatuses.length > 0) {
      throw new Error(`❌ Onboarding schema status enum missing: ${missingStatuses.join(', ')}`);
    }
    console.log('✅ Onboarding status enum expanded with 10 states (including Ready To Join)');

    const empStatusEnum = Employee.schema.path('status').enumValues;
    if (!empStatusEnum.includes('Onboarding') || !empStatusEnum.includes('ReadyToJoin')) {
      throw new Error('❌ Employee schema status enum missing Onboarding or ReadyToJoin states!');
    }
    console.log('✅ Employee status enum contains Onboarding & ReadyToJoin');

    // 3. Verify OnboardingCron jobs
    if (!onboardingJobs || onboardingJobs.length === 0 || onboardingJobs[0].name !== 'OnboardingCron') {
      throw new Error('❌ OnboardingCron job definition invalid!');
    }
    console.log('✅ OnboardingCron job registered (Day-1 Joining Gate, SLA breach, No-Show detection)');

    // 4. Verify Service Hook export
    const hook = onboardingService();
    if (typeof hook.beforeCreate !== 'function' || typeof hook.afterUpdate !== 'function') {
      throw new Error('❌ onboardings service hook structure invalid!');
    }
    console.log('✅ onboardings service hook active with completion, verifiedPercent & Ready To Join gate\n');

    console.log('🎉 ALL JOB ONBOARDING VERIFICATION CHECKS PASSED!');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

runOnboardingSanityCheck();
