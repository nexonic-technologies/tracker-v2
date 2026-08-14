export default function expensesService() {

  /**
   * Check if the given expense date is locked for the given operation.
   * Reads from PeriodClosure collection. Silently skips if model not seeded yet.
   *
   * @param {string} date - ISO date string
   * @param {string} action - human-readable action for the error message
   */
  async function checkExpensePeriodLock(date, action) {
    try {
      const { default: models } = await import('../models/Collection.js');
      if (!models.period_closures) return; // model not yet registered — skip

      const targetDate = new Date(date);
      const closure = await models.period_closures.findOne({
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate },
        status: { $in: ['Closed', 'In Progress'] },
        'modules.expenses.closed': true
      }).lean();

      if (closure) {
        throw new Error(
          `Period ${closure.periodLabel} (${new Date(closure.startDate).toLocaleDateString()} to ${new Date(closure.endDate).toLocaleDateString()}) is closed for expenses. ` +
          `Expenses module was locked on ${closure.modules.expenses.closedAt ? new Date(closure.modules.expenses.closedAt).toLocaleDateString() : 'unknown'}. ` +
          `To ${action} an expense in a closed period, request a period reopen from Finance.`
        );
      }
    } catch (err) {
      // Only re-throw errors we created — swallow DB/model errors
      if (err.message?.includes('Period') && err.message?.includes('closed')) throw err;
    }
  }

  /**
   * Read expense limits from general_settings.
   * Returns safe defaults if settings not found.
   */
  async function getExpenseLimits() {
    try {
      const { default: general_settings } = await import('../models/general_settings.js');
      const settings = await general_settings.findOne()
        .select('finance.expenseDailyLimit finance.expenseLimitByCategory')
        .lean();
      return {
        daily: settings?.finance?.expenseDailyLimit ?? 10000,
        byCategory: {
          travel: settings?.finance?.expenseLimitByCategory?.travel ?? 5000,
          accommodation: settings?.finance?.expenseLimitByCategory?.accommodation ?? 3000,
          food: settings?.finance?.expenseLimitByCategory?.food ?? 1000,
          miscellaneous: settings?.finance?.expenseLimitByCategory?.miscellaneous ?? 2000
        }
      };
    } catch {
      return {
        daily: 10000,
        byCategory: { travel: 5000, accommodation: 3000, food: 1000, miscellaneous: 2000 }
      };
    }
  }

  return {
    async beforeRead(ctx) {
      const { filter = {}, user } = ctx;
      const role = user?.role;
      const userId = user?.id;

      const { getPolicy } = await import('../utils/cache.js');
      const policy = getPolicy(role, 'expenses');
      const hasAllAccess = policy?.allowAccess?.read?.includes('*') || (!policy?.forbiddenAccess?.read?.includes('status') && policy?.permissions?.read);

      // Check if viewing pending approvals tab
      if (filter.status === 'pending' && filter.viewMode === 'approvals') {
        delete filter.viewMode; // delete transient UI field

        if (hasAllAccess) {
          return { filter };
        }

        // Managers can see pending expenses of employees reporting to them
        const { default: models } = await import('../models/Collection.js');
        const reportingEmployees = await models.employees.find({
          'professionalInfo.reportingManager': userId
        }).select('_id').lean();

        const employeeIds = reportingEmployees.map(emp => emp._id);
        filter.employeeId = { $in: employeeIds };

        return { filter };
      }

      // Default: regular read request
      if (!hasAllAccess && userId) {
        // Enforce reading own expenses only
        filter.employeeId = userId;
      }

      return { filter };
    },

    async beforeCreate(ctx) {
      const { body, user } = ctx;
      // Always auto-stamp the employee from the authenticated user
      body.employeeId = user?.id;

      // Ensure expenses array exists
      const items = Array.isArray(body.expenses) ? body.expenses : [];

      // Compute derived fields server-side — never trust the client
      body.dayTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      body.totalExpenses = items.length;

      // Validate required fields
      if (!body.clientId) throw new Error('clientId is required');
      if (!body.date) throw new Error('date is required');
      if (items.length === 0) throw new Error('At least one expense item is required');
      if (body.dayTotal <= 0) throw new Error('Total expense amount must be greater than zero');

      // ── Derive expensePeriod from date ────────────────────────────────────
      // 'YYYY-MM' — used for period closure checks and month-end reports
      const expenseDate = new Date(body.date);
      const mm = String(expenseDate.getMonth() + 1).padStart(2, '0');
      body.expensePeriod = `${expenseDate.getFullYear()}-${mm}`;

      // ── Period Lock Check ─────────────────────────────────────────────────
      await checkExpensePeriodLock(body.date, 'submit');

      // ── Duplicate Detection ───────────────────────────────────────────────
      // Block same employee + client + date regardless of category
      const { default: Expense } = await import('../models/Expense.js');
      const duplicate = await Expense.findOne({
        employeeId: body.employeeId,
        clientId: body.clientId,
        date: body.date,
        status: { $ne: 'rejected' }
      }).lean();

      if (duplicate) {
        throw new Error(
          `An expense already exists for this employee, client, and date. ` +
          `Duplicate submissions are blocked. ` +
          `If this is a correction, reject the original entry first.`
        );
      }

      // ── Per-Category and Daily Limit Enforcement ──────────────────────────
      const limits = await getExpenseLimits();

      for (const item of items) {
        const categoryLimit = limits.byCategory[item.expenseType];
        if (categoryLimit && parseFloat(item.amount) > categoryLimit) {
          throw new Error(
            `${item.expenseType} expense ₹${item.amount} exceeds the daily category limit of ₹${categoryLimit}. ` +
            `Contact Finance for pre-approval if this is exceptional.`
          );
        }
      }

      if (body.dayTotal > limits.daily) {
        throw new Error(
          `Daily expense total ₹${body.dayTotal} exceeds the maximum allowed ₹${limits.daily}. ` +
          `Split across dates or contact Finance for pre-approval.`
        );
      }

      // Default status
      body.status = 'pending';
      body.submittedAt = new Date();
    },

    async beforeUpdate(ctx) {
      const { body, user, existingDoc } = ctx;
      const role = user?.role;
      const userId = user?.id;
      const { getPolicy } = await import('../utils/cache.js');
      const policy = getPolicy(role, 'expenses');
      const forbidden = policy?.forbiddenAccess?.update || [];
      const sensitiveFields = ['status', 'approvedBy', 'rejectedBy', 'approvedAt', 'rejectedAt'];
      const isPrivileged = policy?.permissions?.update && !forbidden.includes('status');

      for (const field of sensitiveFields) {
        if (body[field] !== undefined && (forbidden.includes(field) || !policy?.permissions?.update)) {
          throw new Error(`Forbidden: You do not have permission to update field '${field}'`);
        }
      }

      if (body.status === 'approved' && isPrivileged) {
        // ── Period Lock Check on approval ─────────────────────────────────
        const date = existingDoc?.date;
        if (date) await checkExpensePeriodLock(date, 'approve');

        body.approvedBy = userId;
        body.approvedAt = new Date();
      }

      if (body.status === 'rejected' && isPrivileged) {
        body.rejectedBy = userId;
        body.rejectedAt = new Date();
      }
    },

    /**
     * afterUpdate: Send FCM push to employee when their expense status changes.
     */
    async afterUpdate(ctx) {
      const { docId, data, beforeDoc } = ctx;
      try {
        const statusChanged = data.status && data.status !== beforeDoc?.status;
        if (!statusChanged) return;

        const { default: models } = await import('../models/Collection.js');
        const { default: fcmService } = await import('../utils/notification/fcmService.js');

        const expense = await models.expenses.findById(docId).lean();
        if (!expense?.employeeId) return;

        const statusMessages = {
          approved: 'Your travel expense has been approved.',
          rejected: `Your travel expense has been rejected.${expense.rejectionReason ? ` Reason: ${expense.rejectionReason}` : ''}`
        };

        const message = statusMessages[data.status];
        if (!message) return;

        await fcmService.dispatchNotification({
          type: 'expense_status',
          title: `Expense ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
          message,
          sender: null,
          meta: { model: 'expenses', modelId: docId },
          receiversArray: [expense.employeeId]
        });
      } catch (error) {
        console.error('[expenses service] afterUpdate FCM error:', error);
      }
    }
  };
}
