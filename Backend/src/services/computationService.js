import createQueue from '../utils/queueFactory.js';
import cacheService from './cacheService.js';

class ComputationService {
  constructor() {
    this.computeQueue = createQueue('heavy computations');

    this.setupProcessors();
    this.setupEventHandlers();
  }

  setupProcessors() {
    // Monthly report processor
    this.computeQueue.process('monthly-report', 2, async (job) => {
      const { employeeId, month, year } = job.data;
      return await this.generateMonthlyReport(employeeId, month, year);
    });

    // Dashboard statistics processor
    this.computeQueue.process('dashboard-stats', 5, async (job) => {
      const { userId, role, filters } = job.data;
      return await this.computeDashboardStats(userId, role, filters);
    });

    // Attendance summary processor
    this.computeQueue.process('attendance-summary', 3, async (job) => {
      const { startDate, endDate, departmentId } = job.data;
      return await this.computeAttendanceSummary(startDate, endDate, departmentId);
    });

    // Performance analytics processor
    this.computeQueue.process('performance-analytics', 1, async (job) => {
      const { employeeId, period } = job.data;
      return await this.computePerformanceAnalytics(employeeId, period);
    });

    // Payroll compute processor
    this.computeQueue.process('payroll-compute', 3, async (job) => {
      const { employeeId, month, year, runId, processedBy } = job.data;
      const engine = await import('./payrollEngine.js');
      try {
        const result = await engine.runPayrollForEmployee(employeeId, month, year, processedBy, runId);
        await engine.finalizeRun(runId, result.grossSalary, result.netSalary, result.payrollId);
        return result;
      } catch (err) {
        await engine.finalizeRunOnFailure(runId);
        throw err;
      }
    });
  }

  setupEventHandlers() {
    this.computeQueue.on('error', (err) => {
      console.warn('⚠️ Compute Queue Redis error:', err.message);
    });

    this.computeQueue.on('completed', (job, result) => {
      // console.log(`Computation job ${job.id} completed`);
      // Cache the result
      this.cacheComputationResult(job, result);
    });

    this.computeQueue.on('failed', (job, err) => {
      console.error(`Computation job ${job.id} failed:`, err);
    });
  }

  // Queue monthly report generation
  async queueMonthlyReport(employeeId, month, year, priority = 'normal') {
    try {
      const cacheKey = `report:monthly:${employeeId}:${year}-${month}`;

      // Check if already cached
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }

      const job = await this.computeQueue.add('monthly-report', {
        employeeId,
        month,
        year,
        cacheKey
      }, {
        priority: priority === 'high' ? 1 : 10,
        attempts: 2,
        backoff: 'exponential',
        removeOnComplete: 5,
        removeOnFail: 3
      });

      return { success: true, jobId: job.id, computing: true };
    } catch (error) {
      console.error('Error queuing monthly report:', error);
      return { success: false, error: error.message };
    }
  }

  // Queue dashboard statistics
  async queueDashboardStats(userId, role, filters = {}) {
    try {
      const cacheKey = `stats:dashboard:${userId}:${JSON.stringify(filters)}`;

      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
        return { success: true, data: cached.data, fromCache: true };
      }

      const job = await this.computeQueue.add('dashboard-stats', {
        userId,
        role,
        filters,
        cacheKey
      }, {
        priority: 5,
        attempts: 2,
        removeOnComplete: 10,
        removeOnFail: 5
      });

      return { success: true, jobId: job.id, computing: true };
    } catch (error) {
      console.error('Error queuing dashboard stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate monthly report
  async generateMonthlyReport(employeeId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Import models dynamically to avoid circular dependencies
      const { default: Attendance } = await import('../models/Attendance.js');
      const { default: Leave } = await import('../models/Leave.js');
      const { default: Task } = await import('../models/Task.js');
      const { default: Employee } = await import('../models/Employee.js');

      // Parallel data fetching
      const [employee, attendances, leaves, tasks] = await Promise.all([
        Employee.findById(employeeId).select('basicInfo professionalInfo').lean(),
        Attendance.find({
          employee: employeeId,
          date: { $gte: startDate, $lte: endDate }
        }).lean(),
        Leave.find({
          employeeId,
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
          status: 'Approved'
        }).lean(),
        Task.find({
          assignedTo: employeeId,
          createdAt: { $gte: startDate, $lte: endDate }
        }).lean()
      ]);

      // Compute statistics
      const workingDays = attendances.length;
      const presentDays = attendances.filter(a => a.status === 'Present').length;
      const lateDays = attendances.filter(a => a.status === 'Late Entry').length;
      const leaveDays = leaves.reduce((sum, leave) => sum + leave.totalDays, 0);

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'Completed').length;
      const pendingTasks = totalTasks - completedTasks;

      const totalWorkHours = attendances
        .filter(a => a.checkIn)
        .reduce((sum, a) => {
          let hours = 0;
          if (typeof a.workHours === 'number') {
            hours = a.workHours;
          } else if (a.checkOut) {
            hours = (new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60);
          }
          return sum + hours;
        }, 0);

      const report = {
        employee: {
          id: employee._id,
          name: `${employee.basicInfo.firstName} ${employee.basicInfo.lastName}`,
          designation: employee.professionalInfo.designation,
          department: employee.professionalInfo.department
        },
        period: { month, year, startDate, endDate },
        attendance: {
          workingDays,
          presentDays,
          lateDays,
          leaveDays,
          attendancePercentage: Math.round((presentDays / workingDays) * 100),
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          avgHoursPerDay: Math.round((totalWorkHours / presentDays) * 100) / 100
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          completionRate: Math.round((completedTasks / totalTasks) * 100)
        },
        generatedAt: new Date()
      };

      return report;

    } catch (error) {
      console.error('Error generating monthly report:', error);
      throw error;
    }
  }

  // Compute dashboard statistics
  async computeDashboardStats(userId, role, filters) {
    try {
      const { default: Employee } = await import('../models/Employee.js');
      const { default: Task } = await import('../models/Task.js');
      const { default: Attendance } = await import('../models/Attendance.js');
      const { default: Leave } = await import('../models/Leave.js');

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const { canReadUnrestricted } = await import('./authService.js');
      const userObj = { id: userId, role };

      let baseFilter = {};
      if (!canReadUnrestricted(userObj, 'tasks')) {
        baseFilter = { assignedTo: userId }; // For tasks
      }

      // Parallel aggregations
      const [taskStats, attendanceStats, leaveStats, employeeStats] = await Promise.all([
        Task.aggregate([
          { $match: { ...baseFilter, createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
              inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'To Do'] }, 1, 0] } },
              highPriority: { $sum: { $cond: [{ $eq: ['$priorityLevel', 'High'] }, 1, 0] } }
            }
          }
        ]),

        Attendance.aggregate([
          { $match: { date: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
              late: { $sum: { $cond: [{ $eq: ['$status', 'Late Entry'] }, 1, 0] } }
            }
          }
        ]),

        Leave.aggregate([
          { $match: { createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
              approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } }
            }
          }
        ]),

        canReadUnrestricted(userObj, 'employees') ? Employee.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ['$professionalInfo.status', 'Active'] }, 1, 0] } }
            }
          }
        ]) : Promise.resolve([])
      ]);

      const stats = {
        tasks: taskStats[0] || { total: 0, completed: 0, inProgress: 0, pending: 0, highPriority: 0 },
        attendance: attendanceStats[0] || { total: 0, present: 0, absent: 0, late: 0 },
        leaves: leaveStats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 },
        employees: employeeStats[0] || { total: 0, active: 0 },
        timestamp: Date.now()
      };

      return stats;

    } catch (error) {
      console.error('Error computing dashboard stats:', error);
      throw error;
    }
  }

  // Compute attendance summary
  async computeAttendanceSummary(startDate, endDate, departmentId) {
    try {
      const { default: Attendance } = await import('../models/Attendance.js');

      let matchFilter = {
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
      };

      if (departmentId) {
        // Add department filter through employee lookup
        const pipeline = [
          {
            $lookup: {
              from: 'employees',
              localField: 'employee',
              foreignField: '_id',
              as: 'employeeData'
            }
          },
          {
            $match: {
              ...matchFilter,
              'employeeData.professionalInfo.department': departmentId
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              employees: { $addToSet: '$employee' }
            }
          }
        ];

        const results = await Attendance.aggregate(pipeline);
        return this.formatAttendanceSummary(results);
      } else {
        const results = await Attendance.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              employees: { $addToSet: '$employee' }
            }
          }
        ]);

        return this.formatAttendanceSummary(results);
      }

    } catch (error) {
      console.error('Error computing attendance summary:', error);
      throw error;
    }
  }

  formatAttendanceSummary(results) {
    const summary = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      weekOff: 0,
      uniqueEmployees: new Set()
    };

    results.forEach(result => {
      summary.total += result.count;
      summary[result._id.toLowerCase().replace(' ', '')] = result.count;
      result.employees.forEach(emp => summary.uniqueEmployees.add(emp.toString()));
    });

    summary.uniqueEmployees = summary.uniqueEmployees.size;
    return summary;
  }

  // Cache computation result
  async cacheComputationResult(job, result) {
    try {
      const { cacheKey } = job.data;
      if (cacheKey) {
        const ttl = job.name === 'monthly-report' ? 3600 : 300; // 1 hour for reports, 5 min for stats
        await cacheService.set(cacheKey, result, ttl);
      }
    } catch (error) {
      console.error('Error caching computation result:', error);
    }
  }

  // Get job status
  async getJobStatus(jobId) {
    try {
      const job = await this.computeQueue.getJob(jobId);
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      return {
        status: state,
        progress: job.progress(),
        data: job.returnvalue,
        error: job.failedReason
      };
    } catch (error) {
      console.error('Error getting job status:', error);
      return { status: 'error', error: error.message };
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.computeQueue.getWaiting(),
        this.computeQueue.getActive(),
        this.computeQueue.getCompleted(),
        this.computeQueue.getFailed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    } catch (error) {
      console.error('Error getting computation queue stats:', error);
      return { error: error.message };
    }
  }

  // Clean old jobs
  async cleanOldJobs() {
    try {
      await this.computeQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
      await this.computeQueue.clean(24 * 60 * 60 * 1000, 'failed');
      // console.log('✅ Old computation jobs cleaned');
    } catch (error) {
      console.error('Error cleaning old computation jobs:', error);
    }
  }

  // Graceful shutdown
  async shutdown() {
    try {
      await this.computeQueue.close();
      // console.log('✅ Computation queue closed');
    } catch (error) {
      console.error('Error closing computation queue:', error);
    }
  }
}

export default new ComputationService();