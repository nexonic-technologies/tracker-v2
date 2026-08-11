/**
 * Registry: isAssigned
 * Checks if the current user is assigned to a task
 */
export default function isAssigned(user, record, context = {}) {
  if (!user || !record) return false;
  
  // Check if user is assigned to the task
  if (record.assignedTo && user.id === record.assignedTo.toString()) {
    return true;
  }
  
  // Check if user is in assignedTo array (for multiple assignees)
  if (Array.isArray(record.assignedTo)) {
    return record.assignedTo.some(assignee => 
      user.id === (assignee._id || assignee).toString()
    );
  }
  
  return false;
}