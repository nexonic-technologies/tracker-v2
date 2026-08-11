import models from '../models/Collection.js';

const EmployeeLifecycleHistory = models.employee_life_cycle_histories;


class LifecycleHistoryService {
  /**
   * Log an employee lifecycle history entry.
   * Centralized to ensure zero missing audit records.
   */
  async logEvent({
    employeeId,
    changeType,
    effectiveDate = new Date(),
    previousValue = null,
    newValue,
    changedBy = null,
    reason = '',
    metadata = {},
    session = null
  }) {
    if (!employeeId || !changeType || newValue === undefined) {
      throw new Error('[LifecycleHistoryService] Missing required parameters: employeeId, changeType, or newValue');
    }

    const payload = [{
      employeeId,
      changeType,
      effectiveDate,
      previousValue,
      newValue,
      changedBy,
      reason,
      metadata
    }];

    const options = session ? { session } : {};
    const created = await EmployeeLifecycleHistory.create(payload, options);
    return created[0];
  }

  /**
   * Fetch complete career timeline for an employee.
   */
  async getTimeline(employeeId, options = {}) {
    const query = { employeeId, isDeleted: false };
    if (options.changeType) query.changeType = options.changeType;

    return await EmployeeLifecycleHistory.find(query)
      .sort({ effectiveDate: -1, createdAt: -1 })
      .populate('changedBy', 'basicInfo.firstName basicInfo.lastName professionalInfo.empId')
      .lean();
  }
}

export default new LifecycleHistoryService();
