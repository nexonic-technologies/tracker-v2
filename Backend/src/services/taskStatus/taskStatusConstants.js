/**
 * Constants for Task Status definitions
 */

export const TASK_STATUS = {
  BACKLOGS: 'Backlogs',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  WORKING: 'working',
  DOING: 'doing',
  PROCESSING: 'processing',
  REVIEW: 'Review',
  TESTING: 'testing',
  HOLD: 'Hold',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  DONE: 'done',
  RESOLVED: 'resolved',
  CANCELLED: 'Cancelled',
  FAILED: 'failed'
};

// Define which statuses are considered "Active" and thus need to be paused during checkout
export const ACTIVE_TASK_STATUSES = [
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.WORKING,
  TASK_STATUS.DOING,
  TASK_STATUS.PROCESSING
];

export const NON_ACTIVE_TASK_STATUSES = [
  TASK_STATUS.BACKLOGS,
  TASK_STATUS.PENDING,
  TASK_STATUS.REVIEW,
  TASK_STATUS.TESTING,
  TASK_STATUS.HOLD,
  TASK_STATUS.ON_HOLD,
  TASK_STATUS.COMPLETED,
  TASK_STATUS.DONE,
  TASK_STATUS.RESOLVED,
  TASK_STATUS.CANCELLED,
  TASK_STATUS.FAILED
];
