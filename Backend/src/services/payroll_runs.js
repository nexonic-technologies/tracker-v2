import * as payrollEngine from './business/payrollEngine.js';

const STATE_MACHINE = { Processing: [], Computed: ['Approved'], Approved: ['Paid'] };

export default function payroll_runs() {
  return {
    async beforeCreate(ctx) {
      const { body, role, tenantContext } = ctx;

      const PayrollRun = tenantContext?.getModel
        ? (tenantContext.getModel('payroll_runs') || tenantContext.getModel('PayrollRun'))
        : (await import('../models/PayrollRun.js')).default;

      const existing = await PayrollRun.findOne({
        month: body.month,
        year: body.year,
        status: { $in: ['Approved', 'Paid'] }
      }).lean();

      if (existing) {
        throw new Error(`A payroll run for ${body.month}/${body.year} has already been completed (status: ${existing.status}). Subsequent runs are blocked.`);
      }
    },

    async afterCreate(ctx) {
      const { role, userId, docId, tenantContext } = ctx;

      const PayrollRun = tenantContext?.getModel
        ? (tenantContext.getModel('payroll_runs') || tenantContext.getModel('PayrollRun'))
        : (await import('../models/PayrollRun.js')).default;
      const Employee = tenantContext?.getModel
        ? (tenantContext.getModel('employees') || tenantContext.getModel('Employee'))
        : (await import('../models/Employee.js')).default;
      const SalaryStructure = tenantContext?.getModel
        ? (tenantContext.getModel('salary_structures') || tenantContext.getModel('SalaryStructure'))
        : (await import('../models/SalaryStructure.js')).default;

      const run = await PayrollRun.findById(docId).lean();
      if (!run) return;

      const payrollDate = new Date(run.year, run.month, 0); // last day of run month

      // Resolve employee list
      let employeeIds = run.employeeIds || [];
      if (employeeIds.length === 0) {
        const active = await Employee.find({
          $or: [
            { status: { $in: ['Active', 'active'] } },
            { 'professionalInfo.status': { $in: ['Active', 'active'] } },
            { status: { $exists: false } }
          ]
        }).select('_id').lean();
        employeeIds = active.map(e => e._id);
      }

      // Configuration Readiness Gate: Audit every employee for valid SalaryStructure & Policy
      const validIds = [];
      const configErrors = [];

      for (const eid of employeeIds) {
        const emp = await Employee.findById(eid).select('basicInfo professionalInfo').lean();
        const empName = [emp?.basicInfo?.firstName, emp?.basicInfo?.lastName].filter(Boolean).join(' ') || eid.toString();
        const empCode = emp?.professionalInfo?.empId || eid.toString();

        const struct = await SalaryStructure.findOne({
          employeeId: eid,
          $or: [
            { effectiveFrom: { $lte: payrollDate } },
            { effectiveFrom: { $exists: false } }
          ]
        }).sort({ effectiveFrom: -1, version: -1 }).lean();

        if (struct) {
          validIds.push(eid);
        } else {
          configErrors.push(`${empName} (${empCode}): Missing active Salary Structure`);
        }
      }

      const hasErrors = configErrors.length > 0;
      const errorNote = hasErrors
        ? `CONFIGURATION_ERROR: ${configErrors.length} employee(s) missing mandatory configuration:\n${configErrors.join('\n')}`
        : null;

      // Update run with resolved employees and move to Processing
      await PayrollRun.findByIdAndUpdate(docId, {
        $set: {
          employeeIds: validIds,
          totalEmployees: validIds.length > 0 ? validIds.length : employeeIds.length,
          status: 'Processing',
          ...(errorNote ? { notes: errorNote } : {})
        },
        $push: {
          payrollAuditEvents: {
            event: 'configuration_audit',
            performedBy: userId,
            timestamp: new Date(),
            note: errorNote || 'All employees passed configuration readiness gate.'
          }
        }
      });

      if (validIds.length === 0) {
        await PayrollRun.findByIdAndUpdate(docId, { $set: { status: 'Computed' } });
        return;
      }

      // Compute payrolls for each valid employee
      let totalGross = 0;
      let totalNet = 0;
      const payrollIds = [];

      for (const employeeId of validIds) {
        try {
          const result = await payrollEngine.runPayrollForEmployee(employeeId, run.month, run.year, userId, docId);
          if (result) {
            totalGross += (result.grossSalary || 0);
            totalNet += (result.netSalary || 0);
            if (result.payrollId) payrollIds.push(result.payrollId);
          }
        } catch (err) {
          console.error(`[PayrollRun] Calculation error for employee ${employeeId}:`, err);
        }
      }

      await PayrollRun.findByIdAndUpdate(docId, {
        $set: {
          status: 'Computed',
          processedCount: payrollIds.length,
          totalGross: Math.round(totalGross * 100) / 100,
          totalNet: Math.round(totalNet * 100) / 100,
          payrollIds: payrollIds
        },
        $push: {
          payrollAuditEvents: {
            event: 'computed',
            performedBy: userId,
            timestamp: new Date(),
            note: `Successfully computed payroll for ${payrollIds.length} employees.`
          }
        }
      });
    },

    async beforeUpdate(ctx) {
      const { role, userId, docId, body, existingDoc, tenantContext } = ctx;

      const PayrollRun = tenantContext?.getModel
        ? (tenantContext.getModel('payroll_runs') || tenantContext.getModel('PayrollRun'))
        : (await import('../models/PayrollRun.js')).default;

      let doc = existingDoc;
      if (!doc) {
        doc = await PayrollRun.findById(docId).lean();
      }
      if (!doc) throw new Error('PayrollRun not found.');

      if (body.status && body.status !== doc.status) {
        const allowed = STATE_MACHINE[doc.status] || [];
        if (!allowed.includes(body.status)) {
          throw new Error(`Invalid status transition from "${doc.status}" to "${body.status}". Allowed: [${allowed.join(', ')}]`);
        }

        if (body.status === 'Approved') {
          body.approvedBy = userId;
          body.approvedAt = new Date();
        }

        if (body.status === 'Paid') {
          const Payroll = tenantContext?.getModel
            ? (tenantContext.getModel('payrolls') || tenantContext.getModel('Payroll'))
            : (await import('../models/Payroll.js')).default;
          await Payroll.updateMany(
            { payrollRunId: docId },
            { $set: { status: 'Paid', paymentDate: new Date(), paidAt: new Date() } }
          );
        }
      }

      return body;
    }
  };
}
