// src/services/period_closures.js
export default function period_closuresService() {

  /**
   * Get financial year start month from general_settings
   * Falls back to 4 (April) if not found
   */
  async function getFYStartMonth() {
    try {
      const { default: general_settings } = await import('../models/general_settings.js');
      const settings = await general_settings.findOne()
        .select('finance.financialYearStart')
        .lean();
      return settings?.finance?.financialYearStart ?? 4;
    } catch {
      return 4;
    }
  }

  /**
   * Generate period label from start and end dates
   */
  function generatePeriodLabel(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleString('default', { month: 'long' });
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear === endYear) {
      return `${startMonth} ${startYear}`;
    }
    return `${startMonth} ${startYear} - ${end.toLocaleString('default', { month: 'long' })} ${endYear}`;
  }

  /**
   * Derive financial year label from a date
   */
  async function getFYLabel(date) {
    const fyStart = await getFYStartMonth();
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const fyStartYear = month >= fyStart ? year : year - 1;
    const fyEndYear = fyStartYear + 1;
    return `FY${fyStartYear}-${String(fyEndYear).slice(-2)}`;
  }

  /**
   * Compute summary statistics for a period
   */
  async function computeSummary(startDate, endDate) {
    const { default: models } = await import('../models/Collection.js');
    const summary = {
      totalPayrollRecords: 0,
      totalExpenseAmount: 0,
      totalAttendanceRecords: 0,
      totalTimeTrackingHours: 0,
      totalQuotations: 0
    };

    try {
      // Payroll records
      if (models.payrolls) {
        summary.totalPayrollRecords = await models.payrolls.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate }
        });
      }

      // Expense amount
      if (models.expenses) {
        const expenseResult = await models.expenses.aggregate([
          { $match: { date: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: null, total: { $sum: '$dayTotal' } } }
        ]);
        summary.totalExpenseAmount = expenseResult[0]?.total || 0;
      }

      // Attendance records
      if (models.attendances) {
        summary.totalAttendanceRecords = await models.attendances.countDocuments({
          date: { $gte: startDate, $lte: endDate }
        });
      }

      // Time tracking hours
      if (models.time_tracker_sessions) {
        const timeResult = await models.time_tracker_sessions.aggregate([
          { $match: { startTime: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: null, totalHours: { $sum: { $divide: ['$duration', 3600] } } } }
        ]);
        summary.totalTimeTrackingHours = Math.round((timeResult[0]?.totalHours || 0) * 100) / 100;
      }

      // Quotations
      if (models.quotations) {
        summary.totalQuotations = await models.quotations.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate }
        });
      }
    } catch (error) {
      console.error('[period_closures] computeSummary error:', error);
    }

    return summary;
  }

  return {
    /**
     * Create a new period closure
     */
    async beforeCreate(ctx) {
      const { body, user } = ctx;

      // Validate required fields
      if (!body.startDate) throw new Error('startDate is required');
      if (!body.endDate) throw new Error('endDate is required');

      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);

      if (startDate >= endDate) {
        throw new Error('startDate must be before endDate');
      }

      // Auto-generate period label
      body.periodLabel = generatePeriodLabel(startDate, endDate);

      // Auto-derive financial year label
      body.financialYearLabel = await getFYLabel(startDate);

      // Set creator
      body.createdBy = user?.id;

      // Initialize modules if not provided
      if (!body.modules) {
        body.modules = {
          payroll: { closed: false },
          attendance: { closed: false },
          expenses: { closed: false },
          timeTracking: { closed: false },
          quotations: { closed: false }
        };
      }

      // Initialize summary
      body.summary = await computeSummary(startDate, endDate);
    },

    /**
     * Update period closure - primarily for closing/reopening modules
     */
    async beforeUpdate(ctx) {
      const { body, user, existingDoc } = ctx;
      const userId = user?.id;

      // Handle module closure
      if (body.modules) {
        for (const [moduleName, moduleData] of Object.entries(body.modules)) {
          if (moduleData.closed === true && !existingDoc.modules[moduleName]?.closed) {
            // Closing a module
            body.modules[moduleName].closedAt = new Date();
            body.modules[moduleName].closedBy = userId;

            // Recompute summary when closing
            body.summary = await computeSummary(existingDoc.startDate, existingDoc.endDate);
          }
        }
      }

      // Handle overall status change to Closed
      if (body.status === 'Closed' && existingDoc.status !== 'Closed') {
        body.closedAt = new Date();
        body.closedBy = userId;

        // Close all modules when overall period is closed
        if (!body.modules) body.modules = {};
        for (const moduleName of ['payroll', 'attendance', 'expenses', 'timeTracking', 'quotations']) {
          if (!body.modules[moduleName]) body.modules[moduleName] = {};
          if (!existingDoc.modules[moduleName]?.closed) {
            body.modules[moduleName].closed = true;
            body.modules[moduleName].closedAt = new Date();
            body.modules[moduleName].closedBy = userId;
          }
        }

        // Final summary computation
        body.summary = await computeSummary(existingDoc.startDate, existingDoc.endDate);
      }

      // Handle reopening
      if (body.status === 'Reopened' && existingDoc.status !== 'Reopened') {
        body.reopenedAt = new Date();
        body.reopenedBy = userId;
        body.reopenReason = body.reopenReason || 'No reason provided';
      }
    },

    /**
     * Check if a specific date/period is closed for a given module
     */
    async isPeriodClosed(date, module) {
      try {
        const { default: models } = await import('../models/Collection.js');
        if (!models.period_closures) return false;

        const targetDate = new Date(date);
        const closure = await models.period_closures.findOne({
          startDate: { $lte: targetDate },
          endDate: { $gte: targetDate },
          status: { $in: ['Closed', 'In Progress'] },
          [`modules.${module}.closed`]: true
        }).lean();

        return !!closure;
      } catch {
        return false;
      }
    },

    /**
     * Get active period closure for a given date
     */
    async getActiveClosure(date) {
      try {
        const { default: models } = await import('../models/Collection.js');
        if (!models.period_closures) return null;

        const targetDate = new Date(date);
        return await models.period_closures.findOne({
          startDate: { $lte: targetDate },
          endDate: { $gte: targetDate }
        }).lean();
      } catch {
        return null;
      }
    },

    /**
     * List period closures with optional filtering
     */
    async list(filters = {}) {
      try {
        const { default: models } = await import('../models/Collection.js');
        if (!models.period_closures) return [];

        const query = {};

        if (filters.status) query.status = filters.status;
        if (filters.financialYearLabel) query.financialYearLabel = filters.financialYearLabel;
        if (filters.module) {
          query[`modules.${filters.module}.closed`] = filters.moduleClosed !== false;
        }

        return await models.period_closures
          .find(query)
          .sort({ startDate: -1 })
          .lean();
      } catch {
        return [];
      }
    },

    /**
     * Get period closure by ID with populated fields
     */
    async getById(id) {
      try {
        const { default: models } = await import('../models/Collection.js');
        if (!models.period_closures) return null;

        return await models.period_closures
          .findById(id)
          .populate('createdBy', 'name email')
          .populate('closedBy', 'name email')
          .populate('reopenedBy', 'name email')
          .populate('modules.payroll.closedBy', 'name email')
          .populate('modules.attendance.closedBy', 'name email')
          .populate('modules.expenses.closedBy', 'name email')
          .populate('modules.timeTracking.closedBy', 'name email')
          .populate('modules.quotations.closedBy', 'name email')
          .lean();
      } catch {
        return null;
      }
    }
  };
}
