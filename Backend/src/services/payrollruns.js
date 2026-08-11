import * as payrollEngine from './payrollEngine.js';

const STATE_MACHINE = { Processing: [], Computed: ['Approved'], Approved: ['Paid'] };

export default function payroll_runs() {
  return {
    async beforeCreate(ctx) {
      const { body, role } = ctx;

      const { default: PayrollRun } = await import('../models/PayrollRun.js');
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
      const { role, userId, docId } = ctx;
      const { default: PayrollRun } = await import('../models/PayrollRun.js');
      const { default: Employee } = await import('../models/Employee.js');
      const { default: SalaryStructure } = await import('../models/SalaryStructure.js');

      const run = await PayrollRun.findById(docId).lean();
      if (!run) return;

      const payrollDate = new Date(run.year, run.month, 0); // last day of run month

      // Resolve employee list
      let employeeIds = run.employeeIds || [];
      if (employeeIds.length === 0) {
        const active = await Employee.find({ status: 'Active' }).select('_id').lean();
        employeeIds = active.map(e => e._id);
      }

      // Filter out employees with no valid salary structure for this month
      const validIds = [];
      const skipped = [];
      for (const eid of employeeIds) {
        const struct = await SalaryStructure.findOne({
          employeeId: eid,
          effectiveFrom: { $lte: payrollDate },
          $or: [{ effectiveTo: null }, { effectiveTo: { $gte: payrollDate } }]
        }).lean();
        if (struct) {
          validIds.push(eid);
        } else {
          // Fallback check: check if the employee profile has basic salary details populated
          const emp = await Employee.findById(eid).select('salaryDetails').lean();
          if (emp?.salaryDetails?.basic) {
            validIds.push(eid);
          } else {
            skipped.push(eid.toString());
          }
        }
      }

      const skipNote = skipped.length > 0
        ? `Skipped ${skipped.length} employee(s) — no salary structure: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}`
        : null;

      // Update run with resolved employees and move to Processing
      await PayrollRun.findByIdAndUpdate(docId, {
        $set: {
          employeeIds: validIds,
          totalEmployees: validIds.length,
          status: 'Processing'
        },
        $push: {
          payrollAuditEvents: {
            event: 'processing_started',
            performedBy: userId,
            timestamp: new Date(),
            note: skipNote
          }
        },
        ...(skipNote ? { $set: { notes: skipNote } } : {})
      });

      if (validIds.length === 0) {
        await PayrollRun.findByIdAndUpdate(docId, { $set: { status: 'Computed' } });
        return;
      }

      await payrollEngine.runBulkPayroll(validIds, run.month, run.year, userId, docId);
    },

    async beforeUpdate(ctx) {
      const { role, userId, docId, body, existingDoc } = ctx;

      if (!existingDoc) {
        const { default: PayrollRun } = await import('../models/PayrollRun.js');
        existingDoc = await PayrollRun.findById(docId).lean();
      }
      if (!existingDoc) throw new Error('PayrollRun not found.');

      // Block clients from manually setting Processing or Computed
      if (body.status && ['Processing', 'Computed'].includes(body.status)) {
        throw new Error(`Status "${body.status}" is set internally by the payroll engine.`);
      }

      // Enforce state machine
      if (body.status) {
        const allowed = STATE_MACHINE[existingDoc.status] || [];
        if (!allowed.includes(body.status)) {
          throw new Error(`Invalid run status transition: ${existingDoc.status} → ${body.status}`);
        }

        if (body.status === 'Approved') {
          // Validate all linked payrolls are Processed
          const { default: Payroll } = await import('../models/Payroll.js');
          const unready = await Payroll.countDocuments({
            _id: { $in: existingDoc.payrollIds },
            status: { $in: ['Draft', 'Processing'] }
          });
          if (unready > 0) throw new Error(`${unready} payroll record(s) are not yet Processed. Cannot approve.`);

          body.approvedBy = userId;
          body.approvedAt = new Date();
          body.payrollAuditEvents = [...(existingDoc.payrollAuditEvents || []), {
            event: 'approved', performedBy: userId, timestamp: new Date()
          }];
        }

        if (body.status === 'Paid') {
          ctx.pendingPaidActions = {
            payrollIds: existingDoc.payrollIds,
            employeeIds: existingDoc.employeeIds,
            year: existingDoc.year,
            month: existingDoc.month,
            userId
          };

          body.paidAt = new Date();
          body.payrollAuditEvents = [...(existingDoc.payrollAuditEvents || []), {
            event: 'paid', performedBy: userId, timestamp: new Date()
          }];
        }
      }

      // Block immutable fields from being changed
      const immutable = ['month', 'year', 'employeeIds', 'totalEmployees', 'initiatedBy',
        'processedCount', 'failedCount', 'totalGross', 'totalNet'];
      for (const f of immutable) {
        if (body[f] !== undefined) throw new Error(`Field "${f}" cannot be updated on a PayrollRun.`);
      }

      return body;
    }
  };
}
