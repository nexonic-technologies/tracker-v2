import { createModuleConfig } from "../createModuleConfig";
import { EMPLOYEE_FORM_TABS, employeeSubmitButton } from "../../../constants/employeeForm";

export const employeesConfig = createModuleConfig({
  folder: "Employees",
  model: "employees",
  title: "Employees",
  subtitle: "Employee master records",
  singularName: "Employee",
  fields: [],
  submitButton: employeeSubmitButton,
  tabs: EMPLOYEE_FORM_TABS,
  list: {
    mapTableData: (emp) => ({
      _id: emp._id,
      empId: emp.professionalInfo?.empId || "-",
      name: `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.trim() || "-",
      email: emp.authInfo?.workEmail || "-",
      department: emp.professionalInfo?.department?.name || "-",
      designation:
        emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || "-",
      role: emp.professionalInfo?.role?.name || "-",
      reportingManager: emp.professionalInfo?.reportingManager?.basicInfo?.firstName || "-",
      doj: emp.professionalInfo?.doj
        ? new Date(emp.professionalInfo.doj).toLocaleDateString()
        : "-",
      status: emp.status || "Active",
      _raw: emp,
    }),
    hiddenColumns: [
      "_id",
      "_raw",
      "basicInfo",
      "professionalInfo",
      "authInfo",
      "accountDetails",
      "salaryDetails",
      "personalDocuments",
      "professionalDocuments",
      "leaveStatus",
      "isActive",
      "createdAt",
      "updatedAt",
      "__v",
    ],
    customRender: {
      status: (row) => {
        const styles = {
          Active: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
          Onboarding: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
          ReadyToJoin: "bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800",
          Inactive: "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
          Terminated: "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800",
        };
        return (
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${styles[row.status] || "bg-gray-100 text-gray-800"}`}>
            {row.status}
          </span>
        );
      },
    },
  },
  loadRecord: async (id) => {
    const axiosInstance = (await import("../../../api/axiosInstance")).default;
    const res = await axiosInstance.get(`/populate/read/employees/${id}`);
    return res.data?.data;
  },
});
