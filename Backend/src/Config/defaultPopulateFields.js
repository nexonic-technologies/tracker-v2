// Default fields to populate for each model when no specific fields are requested
export const DEFAULT_POPULATE_FIELDS = {
  employees: {
    'professionalInfo.designation': 'title',
    'professionalInfo.department': 'name',
    'professionalInfo.role': 'name',
    'professionalInfo.reportingManager': 'basicInfo.firstName,basicInfo.lastName'
  },
  departments: {
    'head': 'basicInfo.firstName,basicInfo.lastName'
  },
  designations: {
    'department': 'name'
  },
  leaves: {
    'employee': 'basicInfo.firstName,basicInfo.lastName',
    'leaveType': 'name',
    'approvedBy': 'basicInfo.firstName,basicInfo.lastName'
  },
  tasks: {
    'assignedTo': 'basicInfo.firstName,basicInfo.lastName',
    'createdBy': 'basicInfo.firstName,basicInfo.lastName',
    'taskType': 'name'
  },
  tickets: {
    'clientId': 'name',
    'productId': 'name',
    'type': 'name,icon,color',
    'assignedTo': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'createdBy': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'comments': 'ticketId,message,comment,commentedBy,commenterModel,isPublic,createdAt,updatedAt,attachments',
    'attachments': 'filename,originalName,path,mimetype,size,uploadedBy,uploadedByModel'
  },
  ticket_comments: {
    'commentedBy': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'attachments': 'filename,originalName,path,mimetype,size'
  },
  ticket_attachments: {
    'uploadedBy': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage'
  },
  attendances: {
    'employee': 'basicInfo.firstName,basicInfo.lastName'
  },
  agents: {
    'client': 'name'
  },
  feed_posts: {
    'author': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,name',
    'group': 'name',
    'channel': 'name',
    'viewedBy.employee': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'reactions.employee': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage'
  },
  feed_comments: {
    'author': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,name',
    'postId': 'subject'
  },
  feed_groups: {
    'createdBy': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'members': 'basicInfo.firstName,basicInfo.lastName'
  },
  feed_channels: {
    'createdBy': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'groups': 'name'
  },
  payrolls: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId,professionalInfo.department,professionalInfo.designation,professionalInfo.doj,accountDetails,personalDocuments,authInfo.workEmail',
    'processedBy': 'basicInfo.firstName,basicInfo.lastName',
    'approvedBy': 'basicInfo.firstName,basicInfo.lastName',
    'salaryStructureId': 'version,effectiveFrom,effectiveTo,ctc,components',
    'payrollRunId': 'month,year,status'
  },
  salary_structures: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,professionalInfo.empId,professionalInfo.department',
    'createdBy': 'basicInfo.firstName,basicInfo.lastName'
  },
  payroll_runs: {
    'initiatedBy': 'basicInfo.firstName,basicInfo.lastName',
    'approvedBy': 'basicInfo.firstName,basicInfo.lastName'
  },
  holidays: {},
  wfh_requests: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,professionalInfo.empId',
    'departmentId': 'name',
    'managerId': 'basicInfo.firstName,basicInfo.lastName'
  },
  regularizations: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,professionalInfo.empId',
  },
  operational_events: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId,professionalInfo.department,professionalInfo.designation',
    'resolvedBy': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
    'taskId': 'title,priorityLevel,status,estimatedHours',
    'ticketId': 'title,ticketId,priority,status'
  },
  assets_allocations: {
    'employeeId': 'basicInfo.firstName,basicInfo.lastName,professionalInfo.empId,professionalInfo.department,professionalInfo.designation',
    'departmentId': 'name',
    'assetId': 'name,serialNumber,category,status',
    'managerId': 'basicInfo.firstName,basicInfo.lastName'
  },
  sidebars: {
    'capabilities': 'key action',
    'parentId': 'title'
  }
};

export function getDefaultPopulateFields(modelName, populatePath) {
  return DEFAULT_POPULATE_FIELDS[modelName]?.[populatePath] || 'name';
}