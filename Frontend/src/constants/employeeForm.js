import EmployeeDocumentVault from "../pages/master-data/employees/documents.jsx";
import EmployeeCareerTimeline from "../pages/master-data/employees/timeline.jsx";

export const EMPLOYEE_FORM_TABS = [
  { id: "basic",       label: "Personal",       fieldPrefixes: ["basicInfo"] },
  { id: "professional",label: "Work",           fieldPrefixes: ["professionalInfo"] },
  { id: "auth",        label: "Login",          fieldPrefixes: ["authInfo"] },
  { id: "financial",   label: "Bank & Pay",     fieldPrefixes: ["accountDetails", "salaryDetails"] },
  { id: "documents",   label: "Documents",      fieldPrefixes: ["personalDocuments"] },
  { id: "status",      label: "Status",         fieldPrefixes: ["status"] },
  { id: "vault",       label: "Document Vault", component: EmployeeDocumentVault },
  { id: "career",      label: "Career History", component: EmployeeCareerTimeline },
];


export function buildEmployeeFormFields({ designations = [], departments = [], roles = [], employees = [] }) {
  return [
    { name: "basicInfo.firstName", label: "First Name", type: "text", required: true },
    { name: "basicInfo.lastName", label: "Last Name", type: "text", required: true },
    { name: "basicInfo.dob", label: "Date of Birth", type: "date" },
    { name: "basicInfo.doa", label: "Date of Anniversary", type: "date" },
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
    { name: "basicInfo.phone", label: "Phone", type: "text" },
    { name: "basicInfo.email", label: "Personal Email", type: "email" },
    { name: "basicInfo.fatherName", label: "Father Name", type: "text" },
    { name: "basicInfo.motherName", label: "Mother Name", type: "text" },
    { name: "basicInfo.address.street", label: "Street Address", type: "text", gridClass: "col-span-2" },
    { name: "basicInfo.address.city", label: "City", type: "text" },
    { name: "basicInfo.address.state", label: "State", type: "text" },
    { name: "basicInfo.address.zip", label: "ZIP Code", type: "text" },
    { name: "basicInfo.address.country", label: "Country", type: "text" },

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
    { name: "professionalInfo.doj", label: "Date of Joining", type: "date" },
    { name: "professionalInfo.probationPeriod", label: "Probation Period", type: "text" },
    { name: "professionalInfo.confirmDate", label: "Confirmation Date", type: "date" },

    { name: "authInfo.workEmail", label: "Work Email", type: "email", required: true },
    { name: "authInfo.password", label: "Password", type: "password" },
    { name: "authInfo.googleEmail", label: "Google Email (SSO)", type: "email" },
    {
      name: "authInfo.googleLoginEnabled",
      label: "Google Sign-In Enabled",
      type: "select",
      options: [
        { value: true, label: "Enabled" },
        { value: false, label: "Disabled" },
      ],
      defaultValue: false,
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

    { name: "personalDocuments.pan", label: "PAN Number", type: "text" },
    { name: "personalDocuments.aadhar", label: "Aadhar Number", type: "text" },
    { name: "personalDocuments.esi", label: "ESI Number", type: "text" },
    { name: "personalDocuments.pf", label: "PF Number", type: "text" },

    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Onboarding", label: "Onboarding" },
        { value: "ReadyToJoin", label: "Ready To Join" },
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Terminated", label: "Terminated" },
      ],
      defaultValue: "Active",
    },
  ];
}

export const employeeSubmitButton = { text: "Save Employee", color: "blue" };
