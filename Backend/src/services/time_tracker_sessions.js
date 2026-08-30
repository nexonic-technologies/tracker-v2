import models from '../models/Collection.js';
import { buildQuery } from '../utils/policy/policyEngine.js';
import { syncAttendanceForTimeTracker } from './attendances.js';
const time_tracker_session = models.time_tracker_sessions;
const Task = models.tasks;


/**
 * Resolve employee hourly rate based on Shift model working hours and salary.
 * Business rule: annualWorkingHours = (365 - weeklyOff × 52) × dailyWorkingHours
 * NOT a hardcoded constant.
 */
async function resolveEmployeeHourlyRate(userId, jobType) {
  // Step 1: Get employee's shift to calculate annual working hours
  let annualWorkingHours = 2080; // Safe fallback if no shift assigned

  try {
    const Shift = getTenantModel('Shift');
    const ShiftAssignment = getTenantModel('ShiftAssignment');
    const shiftAssignment = ShiftAssignment ? await ShiftAssignment.findOne({
      employeeId: userId,
      isActive: true
    }).lean() : null;

    if (shiftAssignment) {
      const shift = await Shift.findById(shiftAssignment.shiftId).lean();
      if (shift) {
        const dailyHours = shift.workingHours || 8;
        const weeklyOffCount = (shift.weeklyOff || []).length;
        const workingDaysPerYear = 365 - (weeklyOffCount * 52);
        annualWorkingHours = workingDaysPerYear * dailyHours;
      }
    }
  } catch (err) {
    console.warn('[JobSession] Could not resolve shift for employee, using fallback:', err.message);
  }

  // Step 2: Resolve CTC
  // Priority 1: Active salary structure (most accurate)
  try {
    const salary = await models.salary_structures?.findOne({
      employeeId: userId,
      effectiveTo: null
    }).lean();

    if (salary?.ctc > 0) {
      return Math.round((salary.ctc / annualWorkingHours) * 100) / 100;
    }
  } catch (err) {
    // salary_structures model may not exist yet
  }

  // Priority 2: Employee CTC from Employee model
  const employee = await models.employees.findById(userId).lean();
  if (employee?.salaryDetails?.ctc > 0) {
    return Math.round((employee.salaryDetails.ctc / annualWorkingHours) * 100) / 100;
  }

  // Priority 3: Job type default rate
  if (jobType?.defaultHourlyRate > 0) {
    return jobType.defaultHourlyRate;
  }

  // Priority 4: Zero — log warning
  console.warn(`[JobSession] No hourly rate resolvable for employee ${userId}`);
  return 0;
}

/**
 * Service to pause any active time tracking session when an employee checks out.
 * Exported to be consumed by the attendance check-out hook.
 */
export async function pauseActiveTimerOnCheckout(userId) {
  const activeSession = await time_tracker_session.findOne({
    userId,
    status: 'active'
  });

  if (activeSession) {
    console.log(`[TimeTrackerSync] Active session found for user ${userId} on checkout. Auto-pausing...`);
    // Resolve user's role to execute policy check/update
    const employee = await models.employees.findById(userId).populate('professionalInfo.role').lean();
    const roleId = employee?.professionalInfo?.role?._id?.toString() || employee?.professionalInfo?.role?.toString();

    await buildQuery({
      role: roleId || 'Super Admin',
      userId: userId.toString(),
      action: 'update',
      modelName: 'time_tracker_sessions',
      docId: activeSession._id.toString(),
      body: {
        status: 'paused'
      }
    });
    console.log('[TimeTrackerSync] Active session auto-paused successfully.');
  }
}

/**
 * Time Tracker Sessions Service
 * Manages task-timer tracking and links hours/status changes to Attendance.
 */
export default function time_tracker_sessions() {
  /**
   * Check if time tracking period is closed
   */
  async function checkTimeTrackingPeriodLock(date, action) {
    try {
      const { default: models } = await import('../models/Collection.js');
      if (!models.period_closures) return;

      const targetDate = new Date(date);
      const closure = await models.period_closures.findOne({
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate },
        status: { $in: ['Closed', 'In Progress'] },
        'modules.timeTracking.closed': true
      }).lean();

      if (closure) {
        throw new Error(
          `Period ${closure.periodLabel} is closed for time tracking. ` +
          `Time Tracking module was locked on ${closure.modules.timeTracking.closedAt ? new Date(closure.modules.timeTracking.closedAt).toLocaleDateString() : 'unknown'}. ` +
          `To ${action} time tracking for this period, request a period reopen from Finance.`
        );
      }
    } catch (err) {
      if (err.message?.includes('Period') && err.message?.includes('closed')) throw err;
    }
  }

  return {
    // ── BEFORE CREATE ──────────────────────────────────────────────────────
    beforeCreate: async (ctx) => {
      const { body, userId } = ctx;
      const targetUserId = body.userId || userId;

      // 1. Validate employee is Active
      const employee = await models.employees.findById(targetUserId).lean();
      if (!employee || employee.status !== 'Active') {
        throw new Error('Cannot start time tracking session because the employee status is not Active.');
      }

      // ── Period Lock Check ─────────────────────────────────────────────────
      const sessionDate = body.startTime || new Date();
      await checkTimeTrackingPeriodLock(sessionDate, 'start');

      // Ensure only one active session per user globally
      if (body.status === 'active' || !body.status) {
        const existingSession = await time_tracker_session.findOne({
          userId: targetUserId,
          status: 'active'
        });

        if (existingSession) {
          throw new Error('User already has an active time tracking session. Please stop or pause it first.');
        }

        // Run attendance check-in/verification before activating
        await syncAttendanceForTimeTracker(targetUserId, body.startTime || new Date(), null, 'active', 0);
      }

      body.startTime = body.startTime ? new Date(body.startTime) : new Date();
      if (!body.userId) body.userId = userId;

      // ── Activity-Centric: Resolve job type and cost snapshot ──
      if (body.jobTypeId) {
        const jobType = await models.job_types.findById(body.jobTypeId).lean();
        if (!jobType) throw new Error('Invalid or inactive job type.');
        if (!jobType.isActive) throw new Error('This job type is inactive.');

        // Denormalize category for fast aggregation
        body.jobCategoryId = jobType.categoryId;

        // Freeze cost snapshot at session start
        const employeeHourlyRate = await resolveEmployeeHourlyRate(targetUserId, jobType);
        body.costSnapshot = {
          employeeHourlyRate,
          isBillable: jobType.isBillable,
          currency: 'INR' // TODO: Read from General Settings
        };

        // Auto-derive delivery stage (ONLY for sequential stages)
        if (jobType.defaultDeliveryStage && body.taskId) {
          const task = await Task.findById(body.taskId).lean();
          if (task) {
            body.deliveryStageAtStart = task.deliveryStage;
            // Denormalize clientId from task for direct client cost queries
            body.clientId = task.clientId || null;

            // Check if stage is sequential in status_configs
            try {
              const stageConfig = await models.status_configss?.findOne({
                modelName: 'tasks_delivery_stage'
              }).lean();

              if (stageConfig) {
                const stageEntry = stageConfig.workflowStatuses.find(
                  s => s.key === jobType.defaultDeliveryStage
                );

                if (stageEntry && stageEntry.isSequential !== false) {
                  // Sequential stage: auto-set on task
                  await Task.findByIdAndUpdate(body.taskId, {
                    deliveryStage: jobType.defaultDeliveryStage
                  });
                }
                // Independent stage (Meeting, Training): do NOT touch task.deliveryStage
              }
            } catch (err) {
              console.warn('[JobSession] Could not resolve delivery stage config:', err.message);
            }

            // Auto-set task status if configured
            if (jobType.autoSetTaskStatus && task.status !== jobType.autoSetTaskStatus) {
              await Task.findByIdAndUpdate(body.taskId, {
                status: jobType.autoSetTaskStatus
              });
            }
          }
        }
      }

      // Fallback: resolve clientId for sessions without a jobTypeId
      if (!body.clientId && body.taskId) {
        const task = await Task.findById(body.taskId).select('clientId').lean();
        if (task) body.clientId = task.clientId || null;
      }

      return body;
    },

    // ── AFTER CREATE ──────────────────────────────────────────────────────
    afterCreate: async (ctx) => {
      const { result } = ctx;
      // Set activeJobSessionId on task so UI can show "who is working on this"
      if (result?.taskId && result?.status === 'active') {
        await Task.findByIdAndUpdate(result.taskId, {
          activeJobSessionId: result._id
        });
      }
    },

    // ── BEFORE UPDATE ──────────────────────────────────────────────────────
    beforeUpdate: async (ctx) => {
      const { body, docId, userId } = ctx;
      const session = await time_tracker_session.findById(docId);
      if (!session) throw new Error('Session not found');

      const targetUserId = session.userId || userId;
      const now = new Date();

      // ── Period Lock Check ─────────────────────────────────────────────────
      await checkTimeTrackingPeriodLock(session.startTime, 'update');

      // Handle Resume
      if (body.status === 'active' && session.status === 'paused') {
        // 1. Validate employee is Active on resume
        const employee = await models.employees.findById(targetUserId).lean();
        if (!employee || employee.status !== 'Active') {
          throw new Error('Cannot resume time tracking session because the employee status is not Active.');
        }

        const pauses = session.pauses || [];
        if (pauses.length > 0) {
          const lastPause = pauses[pauses.length - 1];
          if (!lastPause.resumedAt) {
            lastPause.resumedAt = now;
            lastPause.duration = Math.max(0, Math.floor((now.getTime() - new Date(lastPause.pausedAt).getTime()) / 1000));
          }
        }
        body.pauses = pauses;

        // Run attendance check-in/verification on resume
        await syncAttendanceForTimeTracker(targetUserId, now, null, 'active', 0);
      }

      // Handle Pause
      if (body.status === 'paused' && session.status === 'active') {
        const pauses = session.pauses || [];
        pauses.push({ pausedAt: now });
        body.pauses = pauses;
      }

      // Handle Complete
      if (body.status === 'completed' && session.status !== 'completed') {
        body.endTime = now;

        // Calculate total duration
        let totalElapsed = Math.floor((now.getTime() - new Date(session.startTime).getTime()) / 1000);

        // Subtract pause durations
        const pauses = session.pauses || [];
        let totalPauseTime = 0;

        for (const p of pauses) {
          if (p.resumedAt) {
            totalPauseTime += p.duration || 0;
          } else {
            // If it was paused and now completed without resuming, calculate pause until now
            totalPauseTime += Math.floor((now.getTime() - new Date(p.pausedAt).getTime()) / 1000);
            p.resumedAt = now;
          }
        }

        body.duration = Math.max(0, totalElapsed - totalPauseTime);

        // ── Activity-Centric: Compute production cost on completion ──
        if (session.costSnapshot && session.costSnapshot.employeeHourlyRate > 0) {
          const durationHours = body.duration / 3600;
          body.productionCost = Math.round(durationHours * session.costSnapshot.employeeHourlyRate * 100) / 100;
        }

        // Sync completed hours back to Attendance
        await syncAttendanceForTimeTracker(targetUserId, session.startTime, now, 'completed', body.duration);
      }

      return body;
    },

    // ── AFTER UPDATE ───────────────────────────────────────────────────────
    afterUpdate: async (ctx) => {
      const { body, docId } = ctx;
      if (body.status === 'completed') {
        const session = await time_tracker_session.findById(docId);
        if (session && session.duration > 0 && session.taskId) {
          // Add elapsed time to Task.actualHours (duration in seconds → hours)
          const durationHours = session.duration / 3600;
          await Task.findByIdAndUpdate(session.taskId, {
            $inc: { actualHours: durationHours }
          });

          // Clear activeJobSessionId on the task
          await Task.findByIdAndUpdate(session.taskId, {
            $set: { activeJobSessionId: null }
          });
        }
      }
    },

    /**
     * Time Tracking, Labor Cost Burn & Utilization Report Generator
     */
    async beforeReport(ctx) {
      const { getModel } = await import('../utils/appRegistry.js');
      const EmployeeModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('employees') : getModel('employees');
      const TimeSessionModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('time_tracker_sessions') : (time_tracker_session || getModel('time_tracker_sessions'));
      const SalaryStructureModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('salary_structures') : models.salary_structures;

      const dateStr = ctx.query?.date || ctx.body?.date || ctx.filter?.date;
      const month = Number(ctx.query?.month || ctx.body?.month || (new Date().getMonth() + 1));
      const year = Number(ctx.query?.year || ctx.body?.year || new Date().getFullYear());
      const departmentId = ctx.query?.departmentId || ctx.body?.departmentId || ctx.filter?.departmentId;
      const validDeptId = departmentId && departmentId !== 'all' && departmentId !== 'undefined' ? departmentId : null;

      let startDate, endDate;
      if (dateStr) {
        const d = new Date(dateStr);
        startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      } else {
        startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
      }

      const empQuery = { status: 'Active', isDeleted: false };
      if (validDeptId) {
        empQuery['professionalInfo.department'] = validDeptId;
      }

      const employees = await EmployeeModel.find(empQuery)
        .populate('professionalInfo.department', 'name')
        .populate('professionalInfo.designation', 'title name')
        .lean();

      // Query sessions for the period
      const sessions = await TimeSessionModel.find({
        startTime: { $gte: startDate, $lte: endDate }
      }).populate('taskId', 'title isBillable taskCode').lean();

      // Group sessions by employee
      const empSessionsMap = new Map();
      sessions.forEach(s => {
        const empId = (s.userId || s.employeeId || s.user)?._id?.toString() || (s.userId || s.employeeId || s.user)?.toString();
        if (!empId) return;
        if (!empSessionsMap.has(empId)) {
          empSessionsMap.set(empId, []);
        }
        empSessionsMap.get(empId).push(s);
      });

      // Query salary structures for resolving real hourly loaded rates
      const salaries = SalaryStructureModel ? await SalaryStructureModel.find({ isDeleted: false }).lean() : [];
      const salaryMap = new Map();
      salaries.forEach(s => {
        if (s.employeeId) salaryMap.set(s.employeeId.toString(), s);
      });

      const rows = employees.map(emp => {
        const empIdStr = emp._id.toString();
        const userSessions = empSessionsMap.get(empIdStr) || [];

        let totalSeconds = 0;
        let billableSeconds = 0;
        let nonBillableSeconds = 0;
        let activeTaskTitle = '-';

        userSessions.forEach(s => {
          const duration = Number(s.duration) || 0;
          totalSeconds += duration;
          if (s.isBillable || s.taskId?.isBillable) {
            billableSeconds += duration;
          } else {
            nonBillableSeconds += duration;
          }
          if (s.status === 'in_progress' && s.taskId?.title) {
            activeTaskTitle = s.taskId.title;
          }
        });

        const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
        const billableHours = Math.round((billableSeconds / 3600) * 10) / 10;
        const nonBillableHours = Math.round((nonBillableSeconds / 3600) * 10) / 10;

        // Resolve hourly rate
        const sal = salaryMap.get(empIdStr);
        const ctc = sal?.ctc || emp.salaryDetails?.ctc || 600000;
        const resolvedHourlyRate = Math.round((ctc / 2080) * 100) / 100;
        const totalLaborCostBurn = Math.round(totalHours * resolvedHourlyRate);
        const utilization = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

        return {
          empId: emp.professionalInfo?.empId || emp.empId || '-',
          employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || 'Employee',
          department: emp.professionalInfo?.department?.name || '-',
          designation: emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || '-',
          totalSessions: userSessions.length,
          totalLoggedHours: `${totalHours} hrs`,
          billableHours: `${billableHours} hrs`,
          nonBillableHours: `${nonBillableHours} hrs`,
          hourlyCostRate: `₹${resolvedHourlyRate.toLocaleString('en-IN')}/hr`,
          totalLaborCostBurn: `₹${totalLaborCostBurn.toLocaleString('en-IN')}`,
          utilizationRate: `${utilization}%`,
          activeTask: activeTaskTitle
        };
      });

      return { data: rows };
    }
  };
}
