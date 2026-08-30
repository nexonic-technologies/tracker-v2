export default function salary_structures() {
  return {
    async beforeCreate(ctx) {
      const { role, userId, body, tenantContext } = ctx;
      if (!body.employeeId) throw new Error('employeeId is required.');
      if (!body.effectiveFrom) throw new Error('effectiveFrom is required.');

      const SalaryStructure = tenantContext?.getModel
        ? (tenantContext.getModel('salary_structures') || tenantContext.getModel('SalaryStructure'))
        : (await import('../models/SalaryStructure.js')).default;

      // Get latest version for this employee
      const latest = await SalaryStructure.findOne({ employeeId: body.employeeId })
        .sort({ version: -1 })
        .lean();

      body.version = body.version || (latest ? (latest.version || 0) + 1 : 1);
      body.createdBy = body.createdBy || userId;
      body.effectiveTo = body.effectiveTo || null;

      // Close previous open version
      if (latest && latest.effectiveTo === null) {
        const prevEnd = new Date(body.effectiveFrom);
        prevEnd.setDate(prevEnd.getDate() - 1);
        await SalaryStructure.findByIdAndUpdate(latest._id, { $set: { effectiveTo: prevEnd } });
      }

      // Warn if earnings don't sum to ctc/12 (within 5% tolerance) — don't block
      if (body.ctc && Array.isArray(body.earnings) && body.earnings.length > 0) {
        const monthlyCtc = body.ctc / 12;
        const earningsSum = body.earnings
          .filter(e => e.type === 'fixed')
          .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const drift = Math.abs(earningsSum - monthlyCtc) / (monthlyCtc || 1);
        if (drift > 0.05) {
          console.warn(`[SalaryStructure] Earnings sum (${earningsSum}) drifts >5% from CTC/12 (${monthlyCtc.toFixed(0)}) for employee ${body.employeeId}`);
        }
      }

      return body;
    },

    async afterCreate(ctx) {
      const { docId, body, tenantContext } = ctx;
      if (body?.employeeId && docId) {
        const idToLink = Array.isArray(docId) ? docId[0] : docId;
        const Employee = tenantContext?.getModel
          ? tenantContext.getModel('Employee')
          : (await import('../models/Employee.js')).default;
        await Employee.findByIdAndUpdate(body.employeeId, {
          salaryStructure: idToLink
        });
      }
    },

    async beforeUpdate(ctx) {
      const { role, userId, body } = ctx;

      const immutable = ['employeeId', 'version', 'effectiveFrom'];
      for (const f of immutable) {
        if (body[f] !== undefined) throw new Error(`Field "${f}" is immutable on a SalaryStructure. Create a new version instead.`);
      }

      return body;
    }
  };
}

