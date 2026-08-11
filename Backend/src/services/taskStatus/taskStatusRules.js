import { ACTIVE_TASK_STATUSES, TASK_STATUS } from './taskStatusConstants.js';

export const taskStatusRules = {
  /**
   * Check if a task status is considered "active"
   * @param {string} status 
   * @returns {boolean}
   */
  isActiveStatus(status) {
    if (!status) return false;
    // Perform case-insensitive check if needed, but constants are exactly matched usually
    return ACTIVE_TASK_STATUSES.includes(status);
  },

  /**
   * Determine the target hold status based on current status (if we had multiple types of hold)
   * Currently maps all to 'Hold'
   */
  getTargetHoldStatus() {
    return TASK_STATUS.HOLD;
  },

  /**
   * Filter a list of tasks and return only those that are in an active state
   * @param {Array} tasks 
   * @returns {Array}
   */
  filterActiveTasks(tasks) {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.filter(task => this.isActiveStatus(task.status));
  }
};
