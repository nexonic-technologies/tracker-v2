// src/providers/SchedulerProvider.js
import cron from "node-cron";

class SchedulerProvider {
  constructor() {
    this.scheduledJobs = new Map();
  }

  schedule(jobName, expression, timezone, callback) {
    // If a job with the same name is already running, cancel/stop it first
    if (this.scheduledJobs.has(jobName)) {
      this.stop(jobName);
    }

    console.log(`[SchedulerProvider] Scheduling job "${jobName}" with expression: "${expression}" in timezone: "${timezone}"`);
    
    try {
      const task = cron.schedule(expression, callback, {
        scheduled: true,
        timezone: timezone || "Asia/Kolkata"
      });
      this.scheduledJobs.set(jobName, task);
    } catch (err) {
      console.error(`[SchedulerProvider] Failed to schedule job "${jobName}":`, err.message);
    }
  }

  stop(jobName) {
    const task = this.scheduledJobs.get(jobName);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(jobName);
      console.log(`[SchedulerProvider] Stopped job "${jobName}"`);
    }
  }

  stopAll() {
    for (const jobName of this.scheduledJobs.keys()) {
      this.stop(jobName);
    }
  }
}

export default new SchedulerProvider();
