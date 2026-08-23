import { getModel } from '../../utils/appRegistry.js';

export const hrmsTools = [
  {
    name: 'leaves.getBalance',
    description: 'Check leave balance for the current employee',
    risk: 'low',
    requiresConfirmation: false,
    async handler(args, ctx = {}) {
      const employeeId = ctx.employeeId || args.employeeId || ctx.user?.employeeId || ctx.user?.id;
      if (!employeeId) {
        return { error: 'Employee context missing' };
      }

      const EmployeeModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('employees') : null) || getModel('employees');
      const LeaveTypesModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('leave_types') : null) || getModel('leave_types');

      let emp = null;
      try {
        emp = await EmployeeModel.findById(employeeId).lean();
        if (!emp) {
          emp = await EmployeeModel.findOne({ $or: [{ employeeId }, { 'contactInfo.email': employeeId }, { user: employeeId }] }).lean();
        }
      } catch {
        emp = await EmployeeModel.findOne({ $or: [{ employeeId }, { 'contactInfo.email': employeeId }, { user: employeeId }] }).lean();
      }

      if (!emp) {
        return {
          error: `No employee record found for ID/context: "${employeeId}". Please ensure your employee profile is linked.`,
          balances: [],
        };
      }

      const leaveTypes = await LeaveTypesModel.find({ metaStatus: 'active' }).lean();

      const balances = [];
      if (emp?.leaveStatus && Array.isArray(emp.leaveStatus)) {
        for (const ls of emp.leaveStatus) {
          const typeObj = leaveTypes.find((lt) => String(lt._id) === String(ls.leaveType?._id || ls.leaveType));
          const allocated = ls.allocated || ls.total || ls.quota || 0;
          const taken = ls.used || ls.taken || ls.usedThisYear || 0;
          balances.push({
            leaveTypeName: typeObj?.name || ls.leaveName || 'Leave',
            totalAllowed: allocated,
            taken,
            remaining: Math.max(0, allocated - taken),
          });
        }
      }

      return {
        employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || 'Employee',
        employeeId: emp.employeeId || emp._id,
        balances,
      };
    },
  },

  {
    name: 'leaves.apply',
    description: 'Apply for leave on behalf of the employee',
    risk: 'medium',
    requiresConfirmation: true,
    async handler(args, ctx = {}) {
      const employeeId = ctx.employeeId || args.employeeId || ctx.user?.employeeId || ctx.user?.id;
      if (!employeeId) {
        return { error: 'Employee ID required to submit leave' };
      }

      const LeaveModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('leaves') : null) || getModel('leaves');

      const startDate = args.startDate ? new Date(args.startDate) : new Date();
      const endDate = args.endDate ? new Date(args.endDate) : startDate;
      const days = Number(args.totalDays) || 1;
      const reason = args.reason || 'Personal leave requested via Jarvis AI';

      const newLeave = await LeaveModel.create({
        employeeId,
        startDate,
        endDate,
        totalDays: days,
        reason,
        status: 'Pending',
        metaStatus: 'active',
      });

      return {
        success: true,
        leaveId: newLeave._id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalDays: days,
        status: 'Pending Approval',
      };
    },
  },

  {
    name: 'leaves.pendingApprovals',
    description: 'List pending leave approval requests for managers',
    risk: 'low',
    requiresConfirmation: false,
    async handler(args, ctx = {}) {
      const LeaveModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('leaves') : null) || getModel('leaves');
      const pending = await LeaveModel.find({ status: 'Pending' })
        .populate('employeeId', 'basicInfo email')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return {
        count: pending.length,
        requests: pending.map((l) => ({
          id: l._id,
          employeeName: `${l.employeeId?.basicInfo?.firstName || ''} ${l.employeeId?.basicInfo?.lastName || ''}`.trim() || 'Team Member',
          startDate: l.startDate ? new Date(l.startDate).toLocaleDateString() : '',
          endDate: l.endDate ? new Date(l.endDate).toLocaleDateString() : '',
          totalDays: l.totalDays,
          reason: l.reason,
        })),
      };
    },
  },

  {
    name: 'payroll.getLatestPayslip',
    description: 'Get latest payslip breakdown for current employee',
    risk: 'low',
    requiresConfirmation: false,
    async handler(args, ctx = {}) {
      const employeeId = ctx.employeeId || args.employeeId || ctx.user?.employeeId || ctx.user?.id;
      if (!employeeId) {
        return { error: 'Employee context missing' };
      }

      const PayrollModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('payrolls') : null) || getModel('payrolls');
      const latestPayroll = await PayrollModel.findOne({ employeeId })
        .sort({ year: -1, month: -1 })
        .lean();

      if (!latestPayroll) {
        return {
          message: 'No processed payslips found for this employee.',
          hasData: false,
        };
      }

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        hasData: true,
        month: months[latestPayroll.month - 1] || latestPayroll.month,
        year: latestPayroll.year,
        grossSalary: latestPayroll.grossSalary,
        netSalary: latestPayroll.netSalary,
        workingDays: latestPayroll.workingDays,
        presentDays: latestPayroll.presentDays,
        status: latestPayroll.status,
      };
    },
  },

  {
    name: 'policy.search',
    description: 'Lookup and summarize company HR policies',
    risk: 'low',
    requiresConfirmation: false,
    async handler(args, ctx = {}) {
      const HRPolicyModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('hr_policies') : null) || getModel('hr_policies');
      const query = (args.query || args.keyword || '').trim();
      const regex = new RegExp(query, 'i');

      const policies = await HRPolicyModel.find({
        status: { $ne: 'Draft' },
        metaStatus: 'active',
        $or: [{ title: regex }, { category: regex }, { tags: regex }, { content: regex }],
      })
        .limit(5)
        .lean();

      if (policies.length === 0) {
        return {
          query,
          found: false,
          policies: [],
          message: `No active company policies found matching query: "${query}".`,
        };
      }

      return {
        query,
        found: true,
        policies: policies.map((p) => ({
          id: p._id,
          title: p.title,
          category: p.category,
          contentPreview: p.content ? p.content.substring(0, 300) + '...' : '',
        })),
      };
    },
  },
];

export default hrmsTools;
