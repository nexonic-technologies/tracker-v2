import cron from "node-cron";
import attendancesService from "../services/attendances.js";

// Performance monitoring
class CronMonitor {
  constructor() {
    this.stats = {
      lastRun: null,
      duration: 0,
      employeesProcessed: 0,
      errors: 0,
      avgProcessingTime: 0,
      runs: []
    };
  }

  startRun() {
    return {
      startTime: Date.now(),
      employeesProcessed: 0,
      errors: 0
    };
  }

  endRun(runData) {
    const duration = Date.now() - runData.startTime;

    this.stats.lastRun = new Date();
    this.stats.duration = duration;
    this.stats.employeesProcessed = runData.employeesProcessed;
    this.stats.errors = runData.errors;

    // Keep last 30 runs for averaging
    this.stats.runs.push({
      date: new Date(),
      duration,
      employeesProcessed: runData.employeesProcessed,
      errors: runData.errors
    });

    if (this.stats.runs.length > 30) {
      this.stats.runs.shift();
    }

    // Calculate average processing time
    this.stats.avgProcessingTime = this.stats.runs.reduce((sum, run) =>
      sum + run.duration, 0) / this.stats.runs.length;

    // Log performance metrics
    console.log(`Attendance Cron Performance:`, {
      duration: `${duration}ms`,
      employeesProcessed: runData.employeesProcessed,
      errors: runData.errors,
      avgDuration: `${Math.round(this.stats.avgProcessingTime)}ms`,
      queueStats: attendanceService.getQueueStats()
    });

    // Alert if performance degrades
    if (duration > 300000) { // > 5 minutes
      console.warn(`⚠️  Attendance cron took ${Math.round(duration / 1000)}s - consider optimization`);
    }
  }

  getStats() {
    return this.stats;
  }
}

const monitor = new CronMonitor();

export const jobs = [
  {
    name: "AttendanceCron",
    defaultExpression: "22 01 * * *",
    run: async () => {
      const runData = monitor.startRun();
      try {
        await attendanceService.processDailyAttendance();
        const queueStats = attendanceService.getQueueStats();
        runData.employeesProcessed = queueStats.completed;
        runData.errors = queueStats.failed;
      } catch (error) {
        runData.errors++;
        console.error('❌ Daily attendance cron failed:', error);
      } finally {
        monitor.endRun(runData);
      }
    }
  },
  {
    name: "AttendanceWeekendCron",
    defaultExpression: "0 02 * * 0,6",
    run: async () => {
      try {
        await attendanceService.processWeekendAttendance();
      } catch (error) {
        console.error('❌ Weekend attendance processing failed:', error);
      }
    }
  },
  {
    name: "AttendanceHealthCheckCron",
    defaultExpression: "0 * * * *",
    run: () => {
      const queueStats = attendanceService.getQueueStats();
      const cronStats = monitor.getStats();

      if (queueStats.queued > 100) {
        console.warn(`⚠️  Attendance queue backed up: ${queueStats.queued} jobs pending`);
      }
      if (queueStats.failed > 50) {
        console.warn(`⚠️  High failure rate in attendance processing: ${queueStats.failed} failed jobs`);
      }

      const hour = new Date().getHours();
      if (hour % 6 === 0) {
        console.log('📊 Attendance System Health:', {
          queue: queueStats,
          performance: {
            lastRun: cronStats.lastRun,
            avgDuration: `${Math.round(cronStats.avgProcessingTime)}ms`,
            totalRuns: cronStats.runs.length
          }
        });
      }
    }
  },
  {
    name: "AttendanceCleanupCron",
    defaultExpression: "0 03 * * *",
    run: () => {
      if (global.gc) {
        global.gc();
        const memUsage = process.memoryUsage();
        console.log('Memory after GC:', {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
        });
      }
    }
  }
];

export { monitor };