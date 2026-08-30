import { getTenantModel } from "../tenant/tenantContext.js";
import { getModel } from "../utils/appRegistry.js";
import { sendNotification } from "../utils/notificationService.js";
import { generateNotification } from "../middlewares/notificationMessagePrasher.js";
import { calculate } from './business/calculate.js';
import resolvePolicy from './business/attendance/resolvePolicy.js';
import holiday from './business/attendance/holiday.js';
import leave from './business/attendance/leave.js';
import permission from './business/attendance/permission.js';
import workHours from './business/time/workHours.js';
import status from './business/attendance/status.js';
import overtime from './business/time/overtime.js';
import fine from './business/attendance/fine.js';
import { buildAttendanceSnapshot } from './business/attendance/snapshot.js';

function resolveAttendanceModel(ctx) {
  if (ctx && ctx.tenantContext && typeof ctx.tenantContext.getModel === 'function') {
    try {
      return ctx.tenantContext.getModel('Attendance');
    } catch (_) { }
  }
  return getTenantModel('Attendance') || getModel('Attendance');
}

// Explicit Business Calculation Handler Pipeline for Attendance
const ATTENDANCE_HANDLERS = [
  resolvePolicy,
  holiday,
  leave,
  permission,
  workHours,
  status,
  overtime,
  fine
];

/**
 * Pure calculation entry point for Attendance.
 * Supports both database writes and dryRun sandbox evaluations.
 */
export async function calculateAttendance(context, options = { save: true }) {
  const resultState = await calculate({
    context,
    handlers: ATTENDANCE_HANDLERS
  });

  const snapshot = buildAttendanceSnapshot(resultState);

  const fields = {
    status: resultState.status,
    workHours: resultState.workHours || 0,
    overtimeHours: resultState.overtimeHours || 0,
    policyId: resultState.policy?._id,
    policyVersion: resultState.policy?.version || 1,
    shiftId: resultState.shift?._id,
    snapshot
  };

  if (!options.save) {
    return { ...context, ...fields };
  }

  return fields;
}

/**
 * Synchronizes Time Tracker session activity back to the Attendance record.
 * Keeps attendance logic inside attendances.js.
 */
export async function syncAttendanceForTimeTracker(userId, startTime, endTime, status, duration) {
  const { default: models } = await import('../models/Collection.js');
  const { buildQuery } = await import('../utils/policy/policyEngine.js');

  // Get date of the session at midnight UTC to match Attendance date key
  const sessionDate = new Date(startTime);
  sessionDate.setUTCHours(0, 0, 0, 0);

  // 1. Find existing Attendance record for the user and date
  let attendance = await models.attendances.findOne({
    employee: userId,
    date: sessionDate
  });

  if (!attendance) {
    console.log(`[TimeTrackerSync] No attendance record found for user ${userId} on ${sessionDate.toISOString().split('T')[0]}. Auto-checking in...`);

    // Auto-create attendance using buildQuery to trigger validation and hooks
    const employee = await models.employees.findById(userId).populate('professionalInfo.role').lean();
    if (employee) {
      try {
        const roleId = employee.professionalInfo?.role?._id?.toString() || employee.professionalInfo?.role?.toString();
        await buildQuery({
          role: roleId || 'Super Admin',
          userId: userId.toString(),
          action: 'create',
          modelName: 'attendances',
          body: {
            employee: userId,
            employeeName: `${employee.basicInfo?.firstName || ''} ${employee.basicInfo?.lastName || ''}`.trim(),
            managerId: employee.professionalInfo?.reportingManager,
            date: sessionDate,
            checkIn: startTime,
            checkOut: null,
            workType: 'fixed',
            status: 'Present'
          }
        });
        console.log('[TimeTrackerSync] Attendance auto-created successfully.');
      } catch (err) {
        console.error('[TimeTrackerSync] Failed to auto-create attendance:', err.message);
      }
    }
  } else {
    // Attendance already exists!
    const updates = {};
    if (['Absent', 'Unchecked'].includes(attendance.status)) {
      updates.status = 'Present';
    }

    if (status === 'completed') {
      const sessionHours = duration / 3600;

      // Sync accumulated work hours only — do NOT check out employee from attendance
      if (!attendance.workHours || attendance.workHours < sessionHours) {
        updates.workHours = Math.round(sessionHours * 100) / 100;
      }
    }

    if (Object.keys(updates).length > 0) {
      try {
        const employee = await models.employees.findById(userId).populate('professionalInfo.role').lean();
        const roleId = employee?.professionalInfo?.role?._id?.toString() || employee?.professionalInfo?.role?.toString();

        await buildQuery({
          role: roleId || 'Super Admin',
          userId: userId.toString(),
          action: 'update',
          modelName: 'attendances',
          docId: attendance._id.toString(),
          body: updates
        });
        console.log('[TimeTrackerSync] Attendance updated successfully:', updates);
      } catch (err) {
        console.error('[TimeTrackerSync] Failed to update attendance:', err.message);
      }
    }
  }
}

function safeParseAttendanceDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  let str = val.toString().trim();
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += 'Z';
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Attendance Service
 * Handles create + update lifecycle
 */
export default function attendances() {
  return {
    // ---------------- BEFORE CREATE ----------------
    beforeCreate: async (ctx) => {
      const { body, user } = ctx;
      const userId = user?.id;

      // Field normalization & fallback support for mobile clients
      if (!body.employee || (typeof body.employee === 'string' && body.employee.trim() === '')) {
        body.employee = (body.employeeId && body.employeeId.trim() !== '') ? body.employeeId : userId;
      }
      delete body.employeeId;

      if (!body.date) {
        body.date = body.dateStr ? safeParseAttendanceDate(body.dateStr) : new Date();
      }
      delete body.dateStr;

      if (!body.location && (body.checkInLatitude != null || body.checkInLongitude != null)) {
        body.location = {
          latitude: body.checkInLatitude,
          longitude: body.checkInLongitude
        };
      }

      // Initialize punches array on first check-in of the day
      if (body.checkIn) {
        body.checkIn = safeParseAttendanceDate(body.checkIn) || new Date();
        body.punches = [{
          checkIn: body.checkIn,
          location: body.location
        }];
      }

      // Execute Dynamic Business Calculation Pipeline
      const calculatedFields = await calculateAttendance({
        employeeId: body.employee || userId,
        date: body.date,
        checkIn: body.checkIn,
        checkOut: body.checkOut ? safeParseAttendanceDate(body.checkOut) : null,
        punches: body.punches || [],
        body,
        ctx
      }, { save: true });

      Object.assign(body, calculatedFields);

      // Automatically resolve employeeName if not provided
      const isAgent = body.employeeModel === "agents";
      if (!body.employeeName) {
        if (isAgent) {
          const AgentModel = getTenantModel('Agent') || getModel('Agent');
          const agent = AgentModel ? await AgentModel.findById(body.employee || userId).lean() : null;
          if (agent) {
            body.employeeName = agent.name;
          }
        } else {
          const EmployeeModel = getTenantModel('Employee') || getModel('Employee');
          const employee = EmployeeModel ? await EmployeeModel.findById(body.employee || userId).lean() : null;
          if (employee) {
            body.employeeName = `${employee.basicInfo?.firstName || ''} ${employee.basicInfo?.lastName || ''}`.trim();
          }
        }
      }

      return body;
    },

    // ---------------- AFTER CREATE ----------------
    afterCreate: async (ctx) => {
      const { modelName, docId, user } = ctx;
      const userId = user?.id;
      const AttendanceModel = resolveAttendanceModel(ctx);
      const attendanceDoc = AttendanceModel ? await AttendanceModel.findById(docId) : null;
      if (!attendanceDoc) return;

      const request = attendanceDoc.status;

      // Skip for these statuses
      if (["Present", "Check-Out", "Check-In"].includes(request)) {
        // Recovery trigger on check-in
        if (["Present", "Late Entry"].includes(attendanceDoc.status)) {
          try {
            const { default: models } = await import('../models/Collection.js');
            const { scheduleETARecalculation } = await import('./business/etaEngine.js');

            await models.operational_events.updateMany(
              { employeeId: attendanceDoc.employee, type: 'SLA_DELAY', resolvedAt: { $exists: false } },
              { $set: { resolvedAt: new Date() } }
            );

            scheduleETARecalculation(attendanceDoc.employee.toString());
          } catch (err) {
            console.error('[AttendanceService] Recovery trigger failed in afterCreate:', err.message);
          }
        }
        return;
      }

      const message = generateNotification(
        attendanceDoc.employeeName,
        request,
        modelName
      );

      const receiverId = attendanceDoc.managerId;
      if (!receiverId) {
        return;
      }
      await sendNotification({
        sender: userId,
        receiver: receiverId,
        type: 'attendance_request',
        title: 'Attendance Request',
        message,
        relatedModel: 'Attendance',
        relatedId: attendanceDoc._id,
      });
    },

    // ---------------- BEFORE UPDATE ----------------
    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      const AttendanceModel = resolveAttendanceModel(ctx);
      const attendanceDoc = AttendanceModel ? await AttendanceModel.findById(docId) : null;
      if (!attendanceDoc) return;

      // ── Period Closure Lock Check ───────────────────────────────────────────
      try {
        const { default: models } = await import('../models/Collection.js');
        if (models.period_closures && attendanceDoc.date) {
          const targetDate = new Date(attendanceDoc.date);
          const closure = await models.period_closures.findOne({
            startDate: { $lte: targetDate },
            endDate: { $gte: targetDate },
            status: { $in: ['Closed', 'In Progress'] },
            'modules.attendance.closed': true
          }).lean();

          if (closure && !body._forceUnlock) {
            throw new Error(
              `Attendance for ${new Date(attendanceDoc.date).toDateString()} is locked — ` +
              `Period ${closure.periodLabel} is closed for attendance. ` +
              `Attendance module was locked on ${closure.modules.attendance.closedAt ? new Date(closure.modules.attendance.closedAt).toLocaleDateString() : 'unknown'}. ` +
              `Submit a Regularization Request or contact Finance to reopen the period.`
            );
          }
        }
      } catch (err) {
        if (err.message?.includes('locked') && !err.message?.includes('payroll')) throw err;
      }

      // ── Payroll Lock Gate ──────────────────────────────────────────────────
      // Once payroll is marked Paid for this period, attendance becomes immutable.
      // Permitted overrides are governed by whether _forceUnlock was authorized by the Policy Engine.
      if (attendanceDoc.payrollLockedAt && !body._forceUnlock) {
        throw new Error(
          `Attendance for ${new Date(attendanceDoc.date).toDateString()} is locked — ` +
          `payroll was processed and paid on ${new Date(attendanceDoc.payrollLockedAt).toDateString()}. ` +
          `Submit a Regularization Request or contact HR Admin for corrections.`
        );
      }

      // Strip transient domain instruction before persisting to database
      if ('_forceUnlock' in body) {
        delete body._forceUnlock;
      }
      // ── End Payroll Lock Gate ─────────────────────────────────────────────

      const punches = [...(attendanceDoc.punches || [])];

      // Determine if this is a check-in or a check-out update
      const isCheckIn = !!body.checkIn && !body.checkOut;
      const isCheckOut = !!body.checkOut;

      if (isCheckIn) {
        const newCheckIn = safeParseAttendanceDate(body.checkIn);

        // Push a new punch block if last punch is closed, or punches are empty
        const lastPunch = punches[punches.length - 1];
        if (!lastPunch || lastPunch.checkOut) {
          punches.push({
            checkIn: newCheckIn,
            location: body.location
          });
        }

        body.punches = punches;
        body.checkIn = attendanceDoc.checkIn || (punches[0] && punches[0].checkIn) || newCheckIn;
        body.checkOut = null;
      } else if (isCheckOut) {
        const newCheckOut = safeParseAttendanceDate(body.checkOut);

        // Close the last open punch
        const lastPunch = punches[punches.length - 1];
        if (lastPunch && !lastPunch.checkOut) {
          lastPunch.checkOut = newCheckOut;
          if (body.location) {
            lastPunch.checkOutLocation = body.location;
          }
        } else if (!lastPunch) {
          punches.push({
            checkIn: attendanceDoc.checkIn || newCheckOut,
            checkOut: newCheckOut,
            location: body.location
          });
        }

        body.punches = punches;
        body.checkIn = attendanceDoc.checkIn || (punches[0] && punches[0].checkIn) || newCheckOut;
        body.checkOut = newCheckOut;
      }

      // Execute Dynamic Business Calculation Pipeline
      const calculatedFields = await calculateAttendance({
        employeeId: attendanceDoc.employee,
        date: attendanceDoc.date,
        checkIn: body.checkIn || attendanceDoc.checkIn,
        checkOut: body.checkOut !== undefined ? body.checkOut : attendanceDoc.checkOut,
        punches: body.punches || attendanceDoc.punches || [],
        attendanceDoc,
        body,
        ctx
      }, { save: true });

      Object.assign(body, calculatedFields);

      return body;
    },

    // ---------------- AFTER UPDATE ----------------
    afterUpdate: async (ctx) => {
      const { modelName, docId, body, user } = ctx;
      const userId = user?.id;
      const AttendanceModel = resolveAttendanceModel(ctx);
      const attendanceDoc = AttendanceModel ? await AttendanceModel.findById(docId) : null;
      if (!attendanceDoc) return;

      const request = attendanceDoc.request || attendanceDoc.status;

      // Feature: Task Status Domain Service - Auto-Hold tasks on checkout
      if (request === "Check-Out" || request === "Early check-out" || body.checkOut) {
        try {
          const { handleEmployeeCheckout } = await import('./business/attendanceCheckoutHelper.js');
          await handleEmployeeCheckout(attendanceDoc.employee, userId, ctx);
        } catch (err) {
          console.error('[AttendanceService] Failed to trigger handleEmployeeCheckout on checkout:', err);
        }

        try {
          // Auto-pause active time tracking session on checkout
          const { pauseActiveTimerOnCheckout } = await import('./time_tracker_sessions.js');
          await pauseActiveTimerOnCheckout(attendanceDoc.employee);
        } catch (err) {
          console.error('[AttendanceService] Failed to auto-pause time tracker on checkout:', err);
        }
      }

      if (["Present", "Check-Out", "Check-In"].includes(request)) {
        // Recovery trigger on update check-in
        if (["Present", "Late Entry"].includes(attendanceDoc.status)) {
          try {
            const { default: models } = await import('../models/Collection.js');
            const { scheduleETARecalculation } = await import('./business/etaEngine.js');

            await models.operational_events.updateMany(
              { employeeId: attendanceDoc.employee, type: 'SLA_DELAY', resolvedAt: { $exists: false } },
              { $set: { resolvedAt: new Date() } }
            );

            scheduleETARecalculation(attendanceDoc.employee.toString());
          } catch (err) {
            console.error('[AttendanceService] Recovery trigger failed in afterUpdate:', err.message);
          }
        }
        return;
      }

      const recipient = attendanceDoc.managerId || body.managerId;
      if (!recipient) return; // Guard for roles without managers (e.g. Agents)

      const message = generateNotification(
        attendanceDoc.employeeName,
        request,
        modelName
      );
      await sendNotification({
        recipient,
        sender: userId,
        type: 'attendance_request',
        title: 'Attendance Request',
        message,
        relatedModel: 'Attendance',
        relatedId: attendanceDoc._id,
      });
    },

    /**
     * Consolidates multi-punch attendance records into exactly 1 row per employee per day
     */
    async beforeReport(ctx) {
      const dateStr = ctx.query?.date || ctx.body?.date || ctx.filter?.date;
      const departmentId = ctx.query?.departmentId || ctx.body?.departmentId || ctx.filter?.departmentId;
      const validDeptId = departmentId && departmentId !== 'all' && departmentId !== 'undefined' ? departmentId : null;

      const targetDate = dateStr ? new Date(dateStr) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const EmployeeModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('employees') : getModel('employees');
      const AttendanceModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('attendances') : getModel('attendances');

      const empQuery = { status: 'Active', isDeleted: false };
      if (validDeptId) {
        empQuery['professionalInfo.department'] = validDeptId;
      }

      const employees = await EmployeeModel.find(empQuery)
        .populate('professionalInfo.department', 'name')
        .populate('professionalInfo.designation', 'title name')
        .lean();

      // Query all attendance/punch documents for this day
      const attendanceDocs = await AttendanceModel.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).lean();

      // Group attendance records by employee ID
      const empAttendanceMap = new Map();
      attendanceDocs.forEach(att => {
        const empId = (att.employee || att.employeeId)?._id?.toString() || (att.employee || att.employeeId)?.toString();
        if (!empId) return;
        if (!empAttendanceMap.has(empId)) {
          empAttendanceMap.set(empId, []);
        }
        empAttendanceMap.get(empId).push(att);
      });

      // Construct exactly 1 row per active employee
      const rows = employees.map(emp => {
        const empIdStr = emp._id.toString();
        const records = empAttendanceMap.get(empIdStr) || [];

        let firstCheckIn = null;
        let lastCheckOut = null;
        let totalWorkHours = 0;
        let maxLateMinutes = 0;
        let consolidatedStatus = 'Absent';
        let location = 'Office';

        if (records.length > 0) {
          records.forEach(r => {
            const inTime = r.checkIn || r.clockIn;
            const outTime = r.checkOut || r.clockOut;

            if (inTime) {
              const inDate = new Date(inTime);
              if (!firstCheckIn || inDate < firstCheckIn) firstCheckIn = inDate;
            }
            if (outTime) {
              const outDate = new Date(outTime);
              if (!lastCheckOut || outDate > lastCheckOut) lastCheckOut = outDate;
            }

            if (r.workHours) totalWorkHours += Number(r.workHours) || 0;
            if (r.lateMinutes) maxLateMinutes = Math.max(maxLateMinutes, Number(r.lateMinutes) || 0);
            if (r.workLocation) location = r.workLocation;
            if (r.status && r.status !== 'Absent') consolidatedStatus = r.status;
          });

          if (consolidatedStatus === 'Absent' && (firstCheckIn || totalWorkHours > 0)) {
            consolidatedStatus = maxLateMinutes > 0 ? 'Late' : 'Present';
          }
        }

        const fmtTime = (d) => d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-';

        return {
          empId: emp.professionalInfo?.empId || emp.empId || '-',
          employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || 'Employee',
          department: emp.professionalInfo?.department?.name || '-',
          designation: emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || '-',
          status: consolidatedStatus,
          clockIn: fmtTime(firstCheckIn),
          clockOut: fmtTime(lastCheckOut),
          workHours: totalWorkHours > 0 ? `${totalWorkHours.toFixed(1)} hrs` : (firstCheckIn ? 'Active' : '-'),
          lateMinutes: maxLateMinutes > 0 ? `${maxLateMinutes} mins` : 0,
          workLocation: location
        };
      });

      return { data: rows };
    }
  };
}
