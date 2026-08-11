import * as payrollEngine from './payrollEngine.js';

const FROZEN_FIELDS = [
  'grossSalary', 'netSalary', 'earnedBreakdown', 'deductionBreakdown',
  'lopDays', 'salaryStructureId', 'processedBy', 'processedAt', 'workingDays',
  'presentDays', 'overtimePay'
];
const VALID_TRANSITIONS = { Processed: ['Approved'], Approved: ['Paid'] };

export default function payrolls() {
  /**
   * Check if payroll period is closed
   */
  async function checkPayrollPeriodLock(month, year, action) {
    try {
      const { default: models } = await import('../models/Collection.js');
      if (!models.period_closures) return;

      // Create date from month/year (first day of the month)
      const targetDate = new Date(year, month - 1, 1);

      const closure = await models.period_closures.findOne({
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate },
        status: { $in: ['Closed', 'In Progress'] },
        'modules.payroll.closed': true
      }).lean();

      if (closure) {
        throw new Error(
          `Period ${closure.periodLabel} is closed for payroll operations. ` +
          `Payroll module was locked on ${closure.modules.payroll.closedAt ? new Date(closure.modules.payroll.closedAt).toLocaleDateString() : 'unknown'}. ` +
          `To ${action} payroll for this period, request a period reopen from Finance.`
        );
      }
    } catch (err) {
      if (err.message?.includes('Period') && err.message?.includes('closed')) throw err;
    }
  }

  return {
    async beforeCreate(ctx) {
      const { role, userId, body } = ctx;

      const { employeeId, month, year } = body;
      if (!employeeId || !month || !year) throw new Error('employeeId, month, and year are required.');

      // ── Period Lock Check ─────────────────────────────────────────────────
      await checkPayrollPeriodLock(month, year, 'create');

      const { default: Payroll } = await import('../models/Payroll.js');
      const existing = await Payroll.findOne({ employeeId, month: Number(month), year: Number(year) }).lean();

      if (existing) {
        if (['Approved', 'Paid'].includes(existing.status)) {
          throw new Error(`Payroll for employee ${employeeId} ${month}/${year} is already ${existing.status} — cannot recompute.`);
        }
        // Store existing draft ID to safely remove post-commit after new insertion
        ctx.pendingDeleteExistingId = existing._id;
      }

      const payload = await payrollEngine.computePayrollPayload(
        employeeId, Number(month), Number(year), userId, body.payrollRunId || null
      );

      return payload;
    },

    async afterCreate(ctx) {
      if (ctx.pendingDeleteExistingId && ctx.docId) {
        const { default: Payroll } = await import('../models/Payroll.js');
        if (ctx.pendingDeleteExistingId.toString() !== ctx.docId.toString()) {
          await Payroll.deleteOne({ _id: ctx.pendingDeleteExistingId });
        }
      }
    },

    async beforeUpdate(ctx) {
      const { role, userId, docId, body, existingDoc } = ctx;

      if (!existingDoc) {
        const { default: Payroll } = await import('../models/Payroll.js');
        existingDoc = await Payroll.findById(docId).lean();
      }
      if (!existingDoc) throw new Error('Payroll record not found.');

      // ── Period Lock Check ─────────────────────────────────────────────────
      await checkPayrollPeriodLock(existingDoc.month, existingDoc.year, 'update');

      // Immutability gate — frozen after Approved
      if (['Approved', 'Paid'].includes(existingDoc.status)) {
        const attemptedFrozen = Object.keys(body).filter(k => k !== 'status');
        if (attemptedFrozen.length > 0 || body.status === existingDoc.status) {
          if (!(existingDoc.status === 'Approved' && body.status === 'Paid')) {
            throw new Error(`Payroll record is frozen after ${existingDoc.status}. Only Approved→Paid transition is allowed.`);
          }
        }
      }

      // Block direct salary field mutation at any status
      for (const f of FROZEN_FIELDS) {
        if (body[f] !== undefined) throw new Error(`Field "${f}" cannot be updated directly.`);
      }

      // Validate status transition
      if (body.status) {
        const allowed = VALID_TRANSITIONS[existingDoc.status] || [];
        if (!allowed.includes(body.status)) {
          throw new Error(`Invalid status transition: ${existingDoc.status} → ${body.status}`);
        }
        if (body.status === 'Approved') {
          body.approvedBy = userId;
          body.approvedAt = new Date();
          body.frozenAt = new Date();
        }
        if (body.status === 'Paid') {
          body.paidAt = new Date();
        }
      }

      return body;
    }
  };
}
