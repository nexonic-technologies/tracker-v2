import { milestoneFormFields, milestoneSubmitButton } from "./MilestoneForm";
import { referenceTypeFormFields, reference_typesubmitButton } from "./ReferenceTypeForm";
import { leadTypeFormFields, lead_typesubmitButton } from "./LeadTypeForm";

const statusField = {
  name: "Status",
  label: "Status",
  type: "select",
  options: [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ],
  defaultValue: "Active",
};

export const hr_policiesFormFields = [
  { name: "title", label: "Policy Title", type: "text", required: true },
  {
    name: "category",
    label: "Category",
    type: "select",
    options: [
      { value: "Leave Policy", label: "Leave Policy" },
      { value: "Code of Conduct", label: "Code of Conduct" },
      { value: "Attendance", label: "Attendance" },
      { value: "Compensation", label: "Compensation" },
      { value: "Benefits", label: "Benefits" },
      { value: "Performance", label: "Performance" },
      { value: "General", label: "General" }
    ],
    required: true
  },
  { name: "content", label: "Policy Content", type: "textarea", required: true },
  { name: "version", label: "Version", type: "text", defaultValue: "1.0", required: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "Draft", label: "Draft" },
      { value: "Active", label: "Active" },
      { value: "Archived", label: "Archived" }
    ],
    defaultValue: "Draft",
    required: true
  },
  { name: "effectiveDate", label: "Effective Date", type: "date", required: true },
  {
    name: "requiresAcknowledgment",
    label: "Requires Acknowledgment",
    type: "select",
    options: [
      { value: true, label: "Yes" },
      { value: false, label: "No" }
    ],
    defaultValue: false
  }
];

export const leavePolicyFormFields = [
  { name: "name", label: "Policy Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  {
    name: "applicableRoles",
    label: "Applicable Roles",
    type: "AutoComplete",
    multiple: true,
    source: "/populate/read/roles",
    labelField: "name",
    fieldName: "_id"
  },
  {
    name: "applicableDepartments",
    label: "Applicable Departments",
    type: "AutoComplete",
    multiple: true,
    source: "/populate/read/departments",
    labelField: "name",
    fieldName: "_id"
  },
  {
    name: "applicableDesignations",
    label: "Applicable Designations",
    type: "AutoComplete",
    multiple: true,
    source: "/populate/read/designations",
    labelField: "title",
    fieldName: "_id"
  },
  {
    name: "leaves",
    label: "Leaves Configuration",
    type: "SubForm",
    multiple: true,
    gridClass: "col-span-2",
    subFormFields: [
      {
        name: "leaveType",
        label: "Leave Type",
        type: "AutoComplete",
        source: "/populate/read/leave_types",
        labelField: "name",
        fieldName: "_id"
      },
      { name: "maxDaysPerMonth", label: "Max Days Per Month", type: "number", default: 0 },
      { name: "maxDaysPerYear", label: "Max Days Per Year", type: "number", default: 0 },
      {
        name: "carryForward",
        label: "Carry Forward",
        type: "select",
        options: [
          { value: true, label: "Yes" },
          { value: false, label: "No" }
        ],
        default: false
      }
    ]
  },
  {
    name: "status",
    label: "Policy Status",
    type: "select",
    options: [
      { value: "Draft", label: "Draft" },
      { value: "Scheduled", label: "Scheduled" },
      { value: "Active", label: "Active" },
      { value: "Expired", label: "Expired" }
    ],
    defaultValue: "Active",
    required: true
  },
  {
    name: "effectiveFrom",
    label: "Effective From Date",
    type: "date",
    required: true
  },
  {
    name: "effectiveTo",
    label: "Effective To Date",
    type: "date"
  },
  {
    name: "version",
    label: "Version",
    type: "number",
    default: 1
  }
];

export const attendancePolicyFormFields = [
  { name: "name", label: "Policy Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "fullDayHours", label: "Full Day Minimum Hours", type: "number", required: true, default: 8 },
  { name: "halfDayHours", label: "Half Day Minimum Hours", type: "number", required: true, default: 4 },
  { name: "graceMinutes", label: "Grace Minutes", type: "number", default: 15 },
  { name: "lateMarkThreshold", label: "Late Mark Threshold (Minutes)", type: "number", default: 15 },
  { name: "lateMarksForHalfDay", label: "Late Marks resulting in Half Day", type: "number", default: 3 },
  { name: "earlyExitThreshold", label: "Early Exit Threshold (Minutes)", type: "number", default: 15 },
  { name: "weeklyOffRules", label: "Weekly Off Rules (JSON)", type: "textarea", default: '{"type":"static","days":["Sunday"]}' },
  { name: "holidayRules", label: "Holiday Rules (JSON)", type: "textarea", default: '{"sandwich":false}' },
  { name: "lopRules", label: "LOP Rules (JSON)", type: "textarea", default: '{"deductFromLeaveBalance":true}' },
  statusField,
];

export const leaveTypeFormFields = [
  { name: "name", label: "Leave Type Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "maxDays", label: "Max Days", type: "number" },
  statusField,
];

export const shiftFormFields = [
  { name: "name", label: "Shift Name", type: "text", required: true },
  { name: "startTime", label: "Start Time", type: "time", required: true },
  { name: "endTime", label: "End Time", type: "time", required: true },
  {
    name: "crossesMidnight",
    label: "Night Shift (Crosses Midnight)",
    type: "select",
    options: [
      { value: false, label: "No (Same Day Shift)" },
      { value: true, label: "Yes (Overnight / Crosses Midnight)" },
    ],
    defaultValue: false,
  },
  {
    name: "applicableGender",
    label: "Applicable Gender Scope",
    type: "select",
    required: true,
    options: [
      { value: "ALL", label: "All Genders" },
      { value: "MALE", label: "Male Employees Only" },
      { value: "FEMALE", label: "Female Employees Only" },
    ],
    defaultValue: "ALL",
  },
  { name: "workingHours", label: "Net Working Hours", type: "number", required: true, defaultValue: 8.0 },
  { name: "breakDuration", label: "Break Duration (Minutes)", type: "number", defaultValue: 60 },
  { name: "overtimeThreshold", label: "Overtime Threshold (Minutes)", type: "number", defaultValue: 480 },
  {
    name: "weeklyOff",
    label: "Weekly Off Day",
    type: "select",
    options: [
      { value: "Sunday", label: "Sunday" },
      { value: "Saturday", label: "Saturday" },
      { value: "Friday", label: "Friday" },
      { value: "Monday", label: "Monday" },
      { value: "Tuesday", label: "Tuesday" },
      { value: "Wednesday", label: "Wednesday" },
      { value: "Thursday", label: "Thursday" },
    ],
    defaultValue: "Sunday",
  },
  {
    name: "alternateWeeklyOff",
    label: "Alternate Weekly Off",
    type: "select",
    options: [
      { value: "None", label: "None" },
      { value: "SecondFourthSaturday", label: "2nd & 4th Saturday Off" },
      { value: "FirstThirdSaturday", label: "1st & 3rd Saturday Off" },
    ],
    defaultValue: "None",
  },
  statusField,
];

export const taskTypeFormFields = [
  { name: "name", label: "Task Type Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  statusField,
];

export const projectTypeFormFields = [
  { name: "name", label: "Project Type Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  statusField,
];

export const holidayFormFields = [
  { name: "name", label: "Holiday Name", type: "text", required: true },
  { name: "date", label: "Holiday Date", type: "date", required: true },
  {
    name: "type",
    label: "Holiday Type",
    type: "select",
    required: true,
    options: [
      { value: "national", label: "National" },
      { value: "regional", label: "Regional" },
      { value: "optional", label: "Optional" },
      { value: "company", label: "Company" },
    ]
  },
  { name: "applicableStates", label: "Applicable States (comma-separated)", type: "text" },
  { name: "year", label: "Year", type: "number", required: true },
];

const save = (text) => ({ text, color: "blue" });

export const hr_policiesSubmit = save("Save HR Policy");
export const leavePolicySubmit = save("Save Leave Policy");
export const attendancePolicySubmit = save("Save Attendance Policy");
export const leave_typesubmit = save("Save Leave Type");
export const shiftSubmit = save("Save Shift");
export const task_typesubmit = save("Save Task Type");
export const project_typesubmit = save("Save Project Type");
export const holidaySubmit = save("Save Holiday");
export const quotationSubmit = save("Save Quotation");


export const quotationFormFields = [
  { name: "quotationNumber", label: "Quotation Number", type: "text", required: true, readOnly: true },
  {
    name: "clientId",
    label: "Client",
    type: "AutoComplete",
    source: "/populate/read/clients",
    labelField: "name",
    fieldName: "_id",
    required: true
  },
  { name: "contactPerson", label: "Contact Person", type: "text" },
  { name: "validUntil", label: "Valid Until", type: "date" },
  { name: "issueDate", label: "Issue Date", type: "date", defaultValue: new Date().toISOString().split('T')[0] },
  {
    name: "currency",
    label: "Currency",
    type: "select",
    options: [
      { value: "INR", label: "INR (₹)" },
      { value: "USD", label: "USD ($)" },
      { value: "EUR", label: "EUR (€)" },
      { value: "GBP", label: "GBP (£)" }
    ],
    defaultValue: "INR"
  },
  {
    name: "items",
    label: "Quotation Items",
    type: "SubForm",
    multiple: true,
    gridClass: "col-span-2",
    subFormFields: [
      {
        name: "productId",
        label: "Product",
        type: "AutoComplete",
        source: "/populate/read/products",
        labelField: "name",
        fieldName: "_id"
      },
      { name: "productName", label: "Product Name", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "quantity", label: "Quantity", type: "number", required: true, defaultValue: 1 },
      { name: "unitPrice", label: "Unit Price", type: "number", required: true },
      { name: "discount", label: "Discount", type: "number", defaultValue: 0 },
      { name: "tax", label: "Tax", type: "number", defaultValue: 0 },
      { name: "total", label: "Line Total", type: "number", readOnly: true }
    ]
  },
  { name: "discountAmount", label: "Total Discount", type: "number", defaultValue: 0 },
  { name: "taxAmount", label: "Total Tax", type: "number", defaultValue: 0 },
  { name: "subtotal", label: "Subtotal", type: "number", readOnly: true },
  { name: "totalAmount", label: "Total Amount", type: "number", readOnly: true },
  { name: "terms", label: "Terms & Conditions", type: "textarea" },
  { name: "notes", label: "Notes", type: "textarea" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "Draft", label: "Draft" },
      { value: "Sent", label: "Sent" },
      { value: "Accepted", label: "Accepted" },
      { value: "Rejected", label: "Rejected" },
      { value: "Expired", label: "Expired" },
      { value: "Converted to Invoice", label: "Converted to Invoice" }
    ],
    defaultValue: "Draft",
    required: true
  },
  { name: "followUpDate", label: "Follow-up Date", type: "date" },
  {
    name: "assignedTo",
    label: "Assigned To",
    type: "AutoComplete",
    source: "/populate/read/employees",
    transform: (employees) => employees.map(emp => ({
      _id: emp._id,
      name: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || emp.basicInfo?.firstName || `Employee-${emp._id.slice(-4)}`
    })),
    labelField: "name",
    fieldName: "_id"
  }
];

export const workflowSubmit = save("Save Workflow");

export const workflowFormFields = [
  { name: "name", label: "Workflow Name", type: "text", required: true },
  {
    name: "triggerType",
    label: "Trigger Type / Context",
    type: "select",
    options: [
      { value: "Approval", label: "Approval Request" },
      { value: "Escalation", label: "Escalation Policy" },
      { value: "Onboarding", label: "Employee Onboarding" }
    ],
    required: true
  },
  {
    name: "modelName",
    label: "Module/Model",
    type: "select",
    options: [
      { value: "leaves", label: "Leaves" },
      { value: "regularizations", label: "Regularizations" },
      { value: "wfh_requests", label: "WFH Requests" },
      { value: "comp_off_requests", label: "CompOff Requests" },
      { value: "assets_allocations", label: "Asset Allocations" },
      { value: "assets_incidents", label: "Asset Incidents" },
      { value: "tasks", label: "Tasks" },
      { value: "tickets", label: "Tickets" },
      { value: "onboardings", label: "Onboardings" },
      { value: "candidates", label: "Candidates" },
      { value: "leads", label: "Leads" },
      { value: "deals", label: "Deals" }
    ],
    required: true
  },
  {
    name: "conditions.departmentId",
    label: "Department (Optional)",
    type: "AutoComplete",
    source: "/populate/read/departments",
    labelField: "name",
    fieldName: "_id"
  },
  {
    name: "conditions.priorityLevel",
    label: "Priority (Optional)",
    type: "select",
    options: [
      { value: "", label: "Any Priority" },
      { value: "Low", label: "Low" },
      { value: "Medium", label: "Medium" },
      { value: "High", label: "High" },
      { value: "Critical", label: "Critical" },
      { value: "Weekly Priority", label: "Weekly Priority" }
    ]
  },
  {
    name: "isActive",
    label: "Status",
    type: "select",
    options: [
      { value: true, label: "Active" },
      { value: false, label: "Inactive" }
    ],
    defaultValue: true,
    required: true
  },
  {
    name: "steps",
    label: "Workflow Steps",
    type: "SubForm",
    multiple: true,
    gridClass: "col-span-2",
    subFormFields: [
      { name: "stepOrder", label: "Step Order / Level", type: "number", required: true },
      { name: "timeoutHours", label: "Timeout (Hours)", type: "number", defaultValue: 72, required: true },
      {
        name: "actorType",
        label: "Actor / Approver Type",
        type: "select",
        options: [
          { value: "Reporting Manager", label: "Reporting Manager" },
          { value: "Department Manager", label: "Department Manager" },
          { value: "HR", label: "HR" },
          { value: "Specific Role", label: "Specific Role" },
          { value: "Specific User", label: "Specific User" },
          { value: "Candidate", label: "Candidate" }
        ],
        required: true
      },
      {
        name: "specificRoleId",
        label: "Specific Role (if selected)",
        type: "AutoComplete",
        source: "/populate/read/roles",
        labelField: "name",
        fieldName: "_id"
      },
      {
        name: "specificUserId",
        label: "Specific User (if selected)",
        type: "AutoComplete",
        source: "/populate/read/employees",
        transform: (employees) => employees.map(emp => ({
          _id: emp._id,
          name: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || emp.basicInfo?.firstName || `Employee-${emp._id.slice(-4)}`
        })),
        labelField: "name",
        fieldName: "_id"
      },
      {
        name: "actions",
        label: "Actions to Trigger",
        type: "select",
        multiple: true,
        options: [
          { value: "SendNotification", label: "Send Notification" },
          { value: "ChangeAssignee", label: "Add/Change Assignee" },
          { value: "AddFollower", label: "Add Follower" },
          { value: "UpdateStatus", label: "Update Status" },
          { value: "VerifyDocument", label: "Verify Document" }
        ],
        defaultValue: ["SendNotification"],
        required: true
      },
      {
        name: "updateStatusTo",
        label: "Update Status To (Optional)",
        type: "text"
      },
      {
        name: "requiredDocumentType",
        label: "Required Document Type (for onboarding)",
        type: "text"
      }
    ]
  }
];

export {
  milestoneFormFields,
  milestoneSubmitButton,
  referenceTypeFormFields,
  reference_typesubmitButton,
  leadTypeFormFields,
  lead_typesubmitButton,
};
