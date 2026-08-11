/**
 * Registry: isSender
 * Checks if the current user is the sender of a notification or message
 */
export default function isSender(user, record, context = {}) {
  if (!user || !record) return false;
  
  // Check if user is the sender
  if (record.sender && user.id === record.sender.toString()) {
    return true;
  }
  
  // Check senderId field
  if (record.senderId && user.id === record.senderId.toString()) {
    return true;
  }
  
  // Check createdBy as sender
  if (record.createdBy && user.id === record.createdBy.toString()) {
    return true;
  }
  
  return false;
}