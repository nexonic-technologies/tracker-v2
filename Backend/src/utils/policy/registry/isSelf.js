/**
 * Registry: isSelf
 * Checks if the current user is accessing their own record
 */
export default function isSelf(user, record, context = {}) {
  if (!user) return false;

  // Handle list queries (when record is empty/undefined) by returning a Mongoose query filter
  if (!record || Object.keys(record).length === 0) {
    const modelName = context.modelName;
    if (modelName === 'payrolls') {
      return { filter: { employeeId: user.id } };
    }
    if (modelName === 'attendances') {
      return { filter: { employee: user.id } };
    }
    if (modelName === 'daily_activities') {
      return { filter: { user: user.id } };
    }
    if (modelName === 'leaves') {
      return { filter: { employee: user.id } };
    }
    if (modelName === 'regularizations') {
      return { filter: { employee: user.id } };
    }
    return false;
  }

  // Direct ID match
  if (record._id && user.id === record._id.toString()) {
    return true;
  }

  // Employee field match (for Attendance)
  if (record.employee && user.id === record.employee.toString()) {
    return true;
  }

  // User field match (for DailyActivity)
  if (record.user && user.id === record.user.toString()) {
    return true;
  }

  // Employee ID match for attendance, leaves, daily activities
  if (record.employeeId && user.id === record.employeeId.toString()) {
    return true;
  }

  // User ID match for various models
  if (record.userId && user.id === record.userId.toString()) {
    return true;
  }

  // Created by match
  if (record.createdBy && user.id === record.createdBy.toString()) {
    return true;
  }

  return false;
}