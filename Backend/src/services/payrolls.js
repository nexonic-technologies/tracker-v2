import * as payrollEngine from './business/payrollEngine.js';

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
  async function checkPayrollPeriodLock(month, year, action, ctx) {
    try {
      const PeriodClosure = ctx?.tenantContext?.getModel
        ? ctx.tenantContext.getModel('period_closures')
        : (await import('../models/Collection.js')).default.period_closures;
      if (!PeriodClosure) return;

      // Create date from month/year (first day of the month)
      const targetDate = new Date(year, month - 1, 1);

      const closure = await PeriodClosure.findOne({
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
      await checkPayrollPeriodLock(month, year, 'create', ctx);

      const Payroll = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('Payroll') : (await import('../models/Payroll.js')).default;
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
        const Payroll = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('Payroll') : (await import('../models/Payroll.js')).default;
        if (ctx.pendingDeleteExistingId.toString() !== ctx.docId.toString()) {
          await Payroll.deleteOne({ _id: ctx.pendingDeleteExistingId });
        }
      }
    },

    async beforeUpdate(ctx) {
      const { role, userId, docId, body } = ctx;
      let existingDoc = ctx.existingDoc;

      const Payroll = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('Payroll') : (await import('../models/Payroll.js')).default;

      if (!existingDoc) {
        existingDoc = await Payroll.findById(docId).lean();
      }
      if (!existingDoc) throw new Error('Payroll record not found.');

      // ── Period Lock Check ─────────────────────────────────────────────────
      await checkPayrollPeriodLock(existingDoc.month, existingDoc.year, 'update', ctx);

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
    },

    /**
     * Monthly Payroll Register & Variance Audit Hook
     */
    async beforeReport(ctx) {
      const month = Number(ctx.query?.month || ctx.body?.month || (new Date().getMonth() + 1));
      const year = Number(ctx.query?.year || ctx.body?.year || new Date().getFullYear());
      const departmentId = ctx.query?.departmentId || ctx.body?.departmentId || ctx.filter?.departmentId;
      const validDeptId = departmentId && departmentId !== 'all' && departmentId !== 'undefined' ? departmentId : null;

      const PayrollModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('Payroll') : (await import('../models/Payroll.js')).default;
      const EmployeeModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('Employee') : (await import('../models/Employee.js')).default;

      const empQuery = { isDeleted: false };
      if (validDeptId) {
        empQuery['professionalInfo.department'] = validDeptId;
      }

      const employees = await EmployeeModel.find(empQuery)
        .populate('professionalInfo.department', 'name')
        .populate('professionalInfo.designation', 'title name')
        .lean();

      const payrollDocs = await PayrollModel.find({ month, year }).lean();
      const payrollMap = new Map();
      payrollDocs.forEach(p => {
        const empId = p.employeeId?.toString();
        if (empId) payrollMap.set(empId, p);
      });

      const rows = employees.map(emp => {
        const empIdStr = emp._id.toString();
        const p = payrollMap.get(empIdStr);

        const gross = p?.grossSalary || 0;
        const net = p?.netSalary || 0;
        const basic = p?.earnedBreakdown?.['Basic'] || Math.round(gross * 0.5);
        const pf = p?.deductionBreakdown?.['PF Employee'] || p?.deductionBreakdown?.['PF'] || 0;
        const esi = p?.deductionBreakdown?.['ESI Employee'] || p?.deductionBreakdown?.['ESI'] || 0;
        const totalDeductions = p?.totalDeductions || (pf + esi);

        return {
          empId: emp.professionalInfo?.empId || emp.empId || '-',
          employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || 'Employee',
          department: emp.professionalInfo?.department?.name || '-',
          designation: emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || '-',
          monthYear: `${new Date(0, month - 1).toLocaleString('en', { month: 'short' })} ${year}`,
          basicSalary: `₹${basic.toLocaleString('en-IN')}`,
          grossSalary: `₹${gross.toLocaleString('en-IN')}`,
          pfDeduction: pf > 0 ? `₹${pf.toLocaleString('en-IN')}` : '₹0',
          esiDeduction: esi > 0 ? `₹${esi.toLocaleString('en-IN')}` : '₹0',
          totalDeductions: `₹${totalDeductions.toLocaleString('en-IN')}`,
          netPayable: `₹${net.toLocaleString('en-IN')}`,
          presentDays: p?.presentDays ?? '-',
          status: p ? p.status : 'Pending Calculation',
          bankName: emp.bankDetails?.bankName || '-'
        };
      });

      return { data: rows };
    }
  };
}
