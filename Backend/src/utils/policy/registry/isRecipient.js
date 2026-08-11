/**
 * Registry: isRecipient
 * Checks if the current user is the recipient of a notification
 */
export default function isRecipient(user, record, context = {}) {
  if (!user || !record) return false;
  
  // Check if user is the recipient
  if (record.recipient && user.id === record.recipient.toString()) {
    return true;
  }
  
  // Check if user is in recipients array (for multiple recipients)
  if (Array.isArray(record.recipients)) {
    return record.recipients.some(recipient => 
      user.id === (recipient._id || recipient).toString()
    );
  }
  
  // Check recipientId field
  if (record.recipientId && user.id === record.recipientId.toString()) {
    return true;
  }
  
  return false;
}