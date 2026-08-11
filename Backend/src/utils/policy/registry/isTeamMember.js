/**
 * Registry: isTeamMember
 * Checks if the record belongs to a team member under the current user's management
 */
export default function isTeamMember(user, record, context = {}) {
  if (!user || !user.id) return false;
  
  // If we have a record, check direct relationship
  if (record && Object.keys(record).length > 0) {
    // For employee records - check if the employee reports to this manager
    if (record.professionalInfo?.reportingManager) {
      return user.id === record.professionalInfo.reportingManager.toString();
    }
    
    // For attendance/leave records - check if the employee reports to this manager
    if (record.employeeId && context.employee?.professionalInfo?.reportingManager) {
      return user.id === context.employee.professionalInfo.reportingManager.toString();
    }
    
    // Check team lead relationship
    if (record.professionalInfo?.teamLead) {
      return user.id === record.professionalInfo.teamLead.toString();
    }
    
    return false;
  }
  
  // If no record provided (query context), return filter for team members only
  return {
    filter: {
      'professionalInfo.reportingManager': user.id
    }
  };
}