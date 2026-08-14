import cron from 'node-cron';
import Onboarding from '../models/Onboarding.js';
import general_settings from '../models/GeneralSettings.js';
import asyncNotificationService from '../utils/notification/asyncNotificationService.js';

class OnboardingCron {
  constructor() {
    this.cronTask = null;
  }

  async init() {
    try {
      const settings = await general_settings.findOne().lean();
      const cronSchedule = settings?.cron?.onboardingCronSchedule || '0 8 * * *'; // Default 8:00 AM daily
      const isEnabled = settings?.cron?.onboardingCronEnabled !== false;

      if (!isEnabled) {
        console.log('ℹ️ Onboarding Cron is disabled in general_settings.');
        return;
      }

      this.cronTask = cron.schedule(cronSchedule, async () => {
        console.log('⏰ [OnboardingCron] Starting daily onboarding SLA check...');
        await this.runTask();
      });

      console.log(`✅ [OnboardingCron] Scheduled daily at: ${cronSchedule}`);
    } catch (err) {
      console.error('❌ [OnboardingCron] Initialization error:', err.message);
    }
  }

  async runTask() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find active onboardings that are not terminal (Completed/Cancelled)
      const activeOnboardings = await Onboarding.find({
        status: { $in: ['Pending', 'In Progress', 'Documents Pending', 'Verification Pending'] }
      }).populate('employeeId candidateId reportingTo').lean();

      let overdueCount = 0;

      for (const onb of activeOnboardings) {
        const isOverdue = onb.targetCompletionDate && new Date(onb.targetCompletionDate) < today;

        if (isOverdue) {
          overdueCount++;
          // Update status to Overdue if not completed
          await Onboarding.findByIdAndUpdate(onb._id, { status: 'Overdue' });

          const empName = onb.employeeId?.basicInfo?.firstName || 'New Hired Employee';
          const notificationTitle = `Onboarding Overdue: ${empName}`;
          const notificationBody = `Onboarding checklist for ${empName} breached target completion date (${new Date(onb.targetCompletionDate).toLocaleDateString()}). Progress: ${onb.completionPercent}%.`;

          // Notify reporting manager
          if (onb.reportingTo?._id) {
            await sendNotification({
              recipient: onb.reportingTo._id,
              title: notificationTitle,
              message: notificationBody,
              type: 'onboarding_overdue',
              relatedModel: 'Onboarding',
              relatedId: onb._id.toString()
            });
          }
        }
      }

      console.log(`✅ [OnboardingCron] SLA check complete. Flagged ${overdueCount} overdue onboarding(s).`);
    } catch (err) {
      console.error('❌ [OnboardingCron] Error during task execution:', err.message);
    }
  }
}

export const jobs = [
  {
    name: 'OnboardingCron',
    defaultExpression: '0 8 * * *',
    run: async () => {
      const cron = new OnboardingCron();
      await cron.runTask();
    }
  }
];

export default new OnboardingCron();
