const PAGE_CAPABILITY_MAPPING = [
  // Dashboard
  {
    route: "/dashboard",
    capability: "Dashboard:view",
    description: "View dashboard"
  },

  // Employees
  {
    route: "/employees",
    capability: "Employee:view",
    description: "View employee list"
  },
  {
    route: "/employees/create",
    capability: "Employee:create",
    description: "Create new employee"
  },
  {
    route: "/employees/:id/edit",
    capability: "Employee:edit",
    description: "Edit employee details"
  },

  // Leaves
  {
    route: "/leaves",
    capability: "Leave:view",
    description: "View leave requests"
  },
  {
    route: "/leaves/create",
    capability: "Leave:create",
    description: "Create leave request"
  },
  {
    route: "/leaves/:id/approve",
    capability: "Leave:approve",
    description: "Approve leave request"
  },

  // Attendance
  {
    route: "/attendance",
    capability: "Attendance:view",
    description: "View attendance records"
  },
  {
    route: "/attendance/mark",
    capability: "Attendance:create",
    description: "Mark attendance"
  },

  // Departments
  {
    route: "/departments",
    capability: "Department:view",
    description: "View departments"
  },
  {
    route: "/departments/create",
    capability: "Department:create",
    description: "Create department"
  },

  // Designations
  {
    route: "/designations",
    capability: "Designation:view",
    description: "View designations"
  },
  {
    route: "/designations/create",
    capability: "Designation:create",
    description: "Create designation"
  },

  // Roles
  {
    route: "/roles",
    capability: "Role:view",
    description: "View roles"
  },
  {
    route: "/roles/create",
    capability: "Role:create",
    description: "Create role"
  },

  // Tickets
  {
    route: "/tickets",
    capability: "Ticket:view",
    description: "View tickets"
  },
  {
    route: "/tickets/create",
    capability: "Ticket:create",
    description: "Create ticket"
  },
  {
    route: "/tickets/:id/edit",
    capability: "Ticket:edit",
    description: "Edit ticket"
  },

  // Assets
  {
    route: "/assets",
    capability: "Asset:view",
    description: "View assets"
  },
  {
    route: "/assets/create",
    capability: "Asset:create",
    description: "Create asset"
  },
  {
    route: "/assets/:id/edit",
    capability: "Asset:edit",
    description: "Edit asset"
  },

  // Payroll
  {
    route: "/payroll",
    capability: "Payroll:view",
    description: "View payroll"
  },
  {
    route: "/payroll/process",
    capability: "Payroll:process",
    description: "Process payroll"
  },

  // Reports
  {
    route: "/reports",
    capability: "Report:view",
    description: "View reports"
  },
  {
    route: "/reports/:type",
    capability: "Report:view",
    description: "View specific report"
  },

  // CRM
  {
    route: "/crm-parent",
    capability: "CRM:view",
    description: "View CRM Menu Parent"
  },
  {
    route: "/crm",
    capability: "CRM:view",
    description: "View CRM Dashboard"
  },
  {
    route: "/crm/contacts",
    capability: "CRM:view",
    description: "View CRM Contacts"
  },
  {
    route: "/crm/quotations",
    capability: "CRM:view",
    description: "View CRM Quotations"
  },
  {
    route: "/crm/calendar",
    capability: "CRM:view",
    description: "View Marketing Calendar"
  },
  {
    route: "/crm/oa",
    capability: "CRM:view",
    description: "View Order Acknowledgments"
  },
  {
    route: "/crm/orders",
    capability: "CRM:view",
    description: "View CRM Orders"
  },
  {
    route: "/crm/payments",
    capability: "CRM:view",
    description: "View CRM Payments"
  },

  // Settings
  {
    route: "/settings",
    capability: "Settings:view",
    description: "View settings"
  },
  {
    route: "/settings/company",
    capability: "Settings:edit",
    description: "View and edit company profile"
  },
  {
    route: "/settings/edit",
    capability: "Settings:edit",
    description: "Edit settings"
  },

  // Master Data
  {
    route: "/master-data",
    capability: "MasterData:view",
    description: "View Master Data Hub"
  },
  {
    route: "/master-data/HR-Policies",
    capability: "hr_policies:view",
    description: "View HR Policies"
  },
  {
    route: "/master-data/Leave-Policies",
    capability: "LeavePolicy:view",
    description: "View Leave Policies"
  },
  {
    route: "/master-data/Leave-Types",
    capability: "LeaveType:view",
    description: "View Leave Types"
  },
  {
    route: "/master-data/Shifts",
    capability: "Shift:view",
    description: "View Shifts"
  },
  {
    route: "/master-data/Task-Types",
    capability: "TaskType:view",
    description: "View Task Types"
  },
  {
    route: "/master-data/Project-Types",
    capability: "ProjectType:view",
    description: "View Project Types"
  },
  {
    route: "/master-data/Holidays",
    capability: "Holiday:view",
    description: "View Holidays"
  },
  {
    route: "/master-data/Attendance-Policies",
    capability: "AttendancePolicy:view",
    description: "View Attendance Policies"
  },
  {
    route: "/master-data/Workflows",
    capability: "Workflow:view",
    description: "View Workflows"
  },
  {
    route: "/master-data/Reference-Types",
    capability: "ReferenceType:view",
    description: "View Reference Types"
  },
  {
    route: "/master-data/Lead-Types",
    capability: "LeadType:view",
    description: "View Lead Types"
  },
  {
    route: "/master-data/Job-Types",
    capability: "JobType:view",
    description: "View Job Types"
  },
  {
    route: "/master-data/Job-Categories",
    capability: "JobCategory:view",
    description: "View Job Categories"
  },
  {
    route: "/master-data/Service-Providers",
    capability: "ServiceProvider:view",
    description: "View Service Providers"
  },
  {
    route: "/master-data/Leave-Transactions",
    capability: "LeaveTransaction:view",
    description: "View Leave Transactions"
  },
  {
    route: "/master-data/Products",
    capability: "Product:view",
    description: "View Products"
  },
  {
    route: "/master-data/agents",
    capability: "Agent:view",
    description: "View Agents"
  },
  {
    route: "/master-data/clients",
    capability: "Client:view",
    description: "View Clients"
  },
  {
    route: "/master-data/departments",
    capability: "Department:view",
    description: "View Departments"
  },
  {
    route: "/master-data/designations",
    capability: "Designation:view",
    description: "View Designations"
  },
  {
    route: "/master-data/roles",
    capability: "Role:view",
    description: "View Roles"
  }
];

/**
 * Get capability required for a route
 * @param {string} route - Route path
 * @returns {string|null} Capability key or null if no mapping exists
 */
export function getCapabilityForRoute(route) {
  if (!route) return null;
  // Case-insensitive exact match
  const exactMatch = PAGE_CAPABILITY_MAPPING.find(m => m.route.toLowerCase() === route.toLowerCase());
  if (exactMatch) return exactMatch.capability;

  // Pattern match for dynamic routes (case-insensitive)
  const patternMatch = PAGE_CAPABILITY_MAPPING.find(m => {
    const pattern = m.route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`, 'i');
    return regex.test(route);
  });

  if (patternMatch) return patternMatch.capability;

  // Fallback: dynamically compute visibility capability key matching the seeder
  if (!route) return null;
  const parts = route.replace(/^\//, '').split('/');
  const cleanParts = parts.map(part => part.startsWith(':') ? 'id' : part);
  if (cleanParts.length === 1) {
    const prefix = cleanParts[0].charAt(0).toUpperCase() + cleanParts[0].slice(1);
    return `${prefix}:view`;
  } else if (cleanParts.length === 2) {
    const prefix = cleanParts[0].charAt(0).toUpperCase() + cleanParts[0].slice(1);
    return `${prefix}:${cleanParts[1]}`;
  } else {
    const prefix = cleanParts[0].charAt(0).toUpperCase() + cleanParts[0].slice(1);
    return `${prefix}:${cleanParts[cleanParts.length - 1]}`;
  }
}

/**
 * Get all routes that require a specific capability
 * @param {string} capability - Capability key
 * @returns {Array<string>} Array of routes
 */
export function getRoutesForCapability(capability) {
  return PAGE_CAPABILITY_MAPPING
    .filter(m => m.capability === capability)
    .map(m => m.route);
}

/**
 * Get all page capability mappings
 * @returns {Array} All mappings
 */
export function getAllMappings() {
  return PAGE_CAPABILITY_MAPPING;
}

export default {
  PAGE_CAPABILITY_MAPPING,
  getCapabilityForRoute,
  getRoutesForCapability,
  getAllMappings
};
