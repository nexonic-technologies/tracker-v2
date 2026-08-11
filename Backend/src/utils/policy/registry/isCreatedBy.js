/**
 * Registry: isCreatedBy
 * Checks if the current user created the record
 */
export default function isCreatedBy(user, record, context = {}) {
  if (!user || !record) return false;
  
  // Check if user created the record
  if (record.createdBy && user.id === record.createdBy.toString()) {
    return true;
  }
  
  // Check assignedBy field for tasks
  if (record.assignedBy && user.id === record.assignedBy.toString()) {
    return true;
  }
  
  // Check author field
  if (record.author && user.id === record.author.toString()) {
    return true;
  }
  
  return false;
}