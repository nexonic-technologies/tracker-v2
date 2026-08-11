import express from 'express';
import attendancesService from '../services/attendances.js';
import { monitor } from '../cron/AttendanceCron.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/authorize.js';

const router = express.Router();

// Get cron job performance stats (HR only)
router.get('/cron/stats', authenticateToken, authorize('cron', 'read'), async (req, res) => {
  try {
    const cronStats = monitor.getStats();
    const queueStats = attendanceService.getQueueStats();
    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      data: {
        cron: {
          lastRun: cronStats.lastRun,
          duration: cronStats.duration,
          employeesProcessed: cronStats.employeesProcessed,
          errors: cronStats.errors,
          avgProcessingTime: Math.round(cronStats.avgProcessingTime),
          totalRuns: cronStats.runs.length,
          recentRuns: cronStats.runs.slice(-5) // Last 5 runs
        },
        queue: queueStats,
        system: {
          memory: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
            external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
          },
          uptime: Math.round(process.uptime() / 3600) + ' hours'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching cron stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cron statistics'
    });
  }
});

// Manually trigger attendance processing (HR only, for testing)
router.post('/cron/trigger', authenticateToken, authorize('cron', 'update'), async (req, res) => {
  try {
    // Prevent multiple simultaneous runs
    const queueStats = attendanceService.getQueueStats();
    if (queueStats.processing > 0 || queueStats.queued > 0) {
      return res.status(409).json({
        success: false,
        message: 'Attendance processing already in progress',
        queueStats
      });
    }

    // Trigger processing asynchronously
    attendanceService.processDailyAttendance()
      .then(() => {
        // console.log('Manual attendance processing completed');
      })
      .catch(error => {
        console.error('Manual attendance processing failed:', error);
      });

    res.json({
      success: true,
      message: 'Attendance processing triggered successfully',
      note: 'Processing will continue in background. Check stats endpoint for progress.'
    });

  } catch (error) {
    console.error('Error triggering attendance processing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger attendance processing'
    });
  }
});

// Get queue health status
router.get('/cron/health', authenticateToken, async (req, res) => {
  try {
    const queueStats = attendanceService.getQueueStats();
    const cronStats = monitor.getStats();

    // Determine health status
    let status = 'healthy';
    const issues = [];

    if (queueStats.queued > 100) {
      status = 'warning';
      issues.push('Queue backed up with ' + queueStats.queued + ' pending jobs');
    }

    if (queueStats.failed > 50) {
      status = 'warning';
      issues.push('High failure rate: ' + queueStats.failed + ' failed jobs');
    }

    if (cronStats.duration > 300000) { // > 5 minutes
      status = 'warning';
      issues.push('Last run took ' + Math.round(cronStats.duration / 1000) + ' seconds');
    }

    if (cronStats.errors > 10) {
      status = 'critical';
      issues.push('High error count: ' + cronStats.errors + ' errors in last run');
    }

    res.json({
      success: true,
      data: {
        status,
        issues,
        lastCheck: new Date(),
        queue: queueStats,
        lastRun: {
          date: cronStats.lastRun,
          duration: cronStats.duration,
          errors: cronStats.errors
        }
      }
    });

  } catch (error) {
    console.error('Error checking cron health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check system health'
    });
  }
});

export default router;