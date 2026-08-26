

// export const EMPLOYEE_FORM_TABS = [
//   {
//     id: "details",
//     label: "Employee Profile",
//     fieldPrefixes: [
//       "_sec",
//       "basicInfo",
//       "professionalInfo",
//       "authInfo",
//       "accountDetails",
//       "salaryDetails",
//       "personalDocuments",
//       "status"
//     ],
//   },
// ];

export function buildEmployeeFormFields({ designations = [], departments = [], roles = [], employees = [] }) {
  return [
    // ════════════════ 1. PERSONAL INFORMATION ════════════════
    {
      type: "section",
      name: "_sec_personal",
      label: "Personal Information",
    },
    {
      name: "basicInfo.firstName", label: "First Name", type: "text", required: true,
      validate: { pattern: /^[A-Za-z\s]+$/, message: "Only letters and spaces are allowed" },
    },
    {
      name: "basicInfo.lastName", label: "Last Name", type: "text", required: true,
      validate: { pattern: /^[A-Za-z\s]+$/, message: "Only letters and spaces are allowed" },
    },
    {
      name: "basicInfo.dob", label: "Date of Birth", type: "date",
      validate: { maxDate: "today", message: "Date of Birth cannot be a future date" },
    },
    {
      name: "basicInfo.maritalStatus",
      label: "Marital Status",
      type: "select",
      options: [
        { value: "Single", label: "Single" },
        { value: "Married", label: "Married" },
        { value: "Divorced", label: "Divorced" },
        { value: "Widowed", label: "Widowed" },
      ],
    },
    {
      name: "basicInfo.doa", label: "Date of Anniversary", type: "date",
      validate: { maxDate: "today", message: "Anniversary date cannot be a future date" },
      visibleWhen: { field: "basicInfo.maritalStatus", operator: "neq", value: "Single" },
    },
    {
      name: "basicInfo.phone", label: "Phone", type: "text",
      validate: { pattern: /^\d{10}$/, maxLength: 10, digitOnly: true, message: "Phone must be exactly 10 digits (no letters)" },
    },
    {
      name: "basicInfo.email", label: "Personal Email", type: "email",
      validate: { pattern: /^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$/, message: "Enter a valid email address (e.g. name@example.com)" },
    },
    {
      name: "basicInfo.fatherName", label: "Father Name", type: "text",
      validate: { pattern: /^[A-Za-z\s]+$/, message: "Only letters and spaces are allowed" },
    },
    {
      name: "basicInfo.motherName", label: "Mother Name", type: "text",
      validate: { pattern: /^[A-Za-z\s]+$/, message: "Only letters and spaces are allowed" },
    },

    // ════════════════ 2. ADDRESS & LOCATION ════════════════
    {
      type: "section",
      name: "_sec_address",
      label: "Address & Location",
    },
    { name: "basicInfo.address.country", label: "Country", type: "text" },
    { name: "basicInfo.address.state", label: "State", type: "text" },
    { name: "basicInfo.address.city", label: "City", type: "text" },
    {
      name: "basicInfo.address.zip", label: "PIN Code", type: "text",
      validate: { pattern: /^\d{6}$/, maxLength: 6, digitOnly: true, message: "PIN Code must be exactly 6 digits (no letters)" },
    },
    {
      name: "basicInfo.address.street", label: "Street Address", type: "text",
      gridClass: "col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-4"
    },

    // ════════════════ 3. PROFESSIONAL & EMPLOYMENT ════════════════
    {
      type: "section",
      name: "_sec_professional",
      label: "Professional & Employment Details",
    },
    { name: "professionalInfo.empId", label: "Employee ID", type: "text", required: true },
    {
      name: "professionalInfo.designation",
      label: "Designation",
      type: "select",
      options: designations.map((d) => ({ value: d._id, label: d.title || d.name })),
    },
    {
      name: "professionalInfo.department",
      label: "Department",
      type: "select",
      options: departments.map((d) => ({ value: d._id, label: d.name })),
    },
    {
      name: "professionalInfo.role",
      label: "Role",
      type: "select",
      options: roles.map((r) => ({ value: r._id, label: r.name })),
    },
    {
      name: "professionalInfo.reportingManager",
      label: "Reporting Manager",
      type: "select",
      options: employees.map((e) => ({
        value: e._id,
        label: `${e.basicInfo?.firstName || ""} ${e.basicInfo?.lastName || ""}`.trim() || "Unknown",
      })),
    },
    {
      name: "professionalInfo.teamLead",
      label: "Team Lead",
      type: "select",
      options: employees.map((e) => ({
        value: e._id,
        label: `${e.basicInfo?.firstName || ""} ${e.basicInfo?.lastName || ""}`.trim() || "Unknown",
      })),
    },
    {
      name: "professionalInfo.level",
      label: "Level",
      type: "select",
      options: [
        { value: "L1", label: "L1" },
        { value: "L2", label: "L2" },
        { value: "L3", label: "L3" },
        { value: "L4", label: "L4" },
      ],
    },
    {
      name: "professionalInfo.doj", label: "Date of Joining", type: "date",
      validate: { maxDate: "today", message: "Date of Joining cannot be a future date" },
    },
    { name: "professionalInfo.probationPeriod", label: "Probation Period", type: "text" },
    {
      name: "professionalInfo.confirmDate", label: "Confirmation Date", type: "date",
      validate: { maxDate: "today", message: "Confirmation date cannot be a future date" },
    },

    // ════════════════ 4. SECURITY & AUTHENTICATION ════════════════
    {
      type: "section",
      name: "_sec_auth",
      label: "Security & Login Credentials",
    },
    {
      name: "authInfo.workEmail", label: "Work Email", type: "email", required: true,
      validate: { pattern: /^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$/, message: "Enter a valid work email address" },
    },
    { name: "authInfo.password", label: "Password", type: "password" },
    {
      name: "authInfo.googleEmail", label: "Google Email (SSO)", type: "email",
      validate: { pattern: /^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$/, message: "Enter a valid Google email address" },
    },
    {
      name: "authInfo.googleLoginEnabled",
      label: "Google Sign-In Enabled",
      type: "switch",
      defaultValue: false,
    },

    // ════════════════ 5. BANK & COMPENSATION ════════════════
    {
      type: "section",
      name: "_sec_bank",
      label: "Bank & Compensation Details",
    },
    { name: "accountDetails.accountName", label: "Account Name", type: "text" },
    { name: "accountDetails.accountNo", label: "Account Number", type: "text" },
    { name: "accountDetails.bankName", label: "Bank Name", type: "text" },
    { name: "accountDetails.branch", label: "Branch", type: "text" },
    { name: "accountDetails.ifscCode", label: "IFSC Code", type: "text" },
    { name: "salaryDetails.package", label: "Package", type: "number" },
    { name: "salaryDetails.basic", label: "Basic Salary", type: "number" },
    { name: "salaryDetails.ctc", label: "CTC", type: "number" },
    { name: "salaryDetails.allowances", label: "Allowances", type: "number" },
    { name: "salaryDetails.deductions", label: "Deductions", type: "number" },

    // ════════════════ 6. IDENTITY & STATUTORY DOCUMENTS ════════════════
    {
      type: "section",
      name: "_sec_documents",
      label: "Identity & Statutory Documents",
    },
    { name: "personalDocuments.pan", label: "PAN Number", type: "text" },
    { name: "personalDocuments.aadhar", label: "Aadhar Number", type: "text" },
    { name: "personalDocuments.esi", label: "ESI Number", type: "text" },
    { name: "personalDocuments.pf", label: "PF Number", type: "text" },

    // ════════════════ 7. STATUS & ACCESS ════════════════
    {
      type: "section",
      name: "_sec_status",
      label: "Status & Access",
    },
    {
      name: "status",
      label: "Employee Status",
      type: "switch",
      switchLabels: { on: "Active", off: "Inactive" },
      defaultValue: "Active",
      gridClass: "col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-4",
    },
  ];
}

export const employeeSubmitButton = { text: "Save Employee", color: "blue" };
