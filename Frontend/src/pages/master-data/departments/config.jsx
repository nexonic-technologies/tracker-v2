import {
  departmentFormFields,
  departmentSubmitButton,
} from "../../../constants/departmentForm";
import { createModuleConfig } from "../createModuleConfig";

export const departmentsConfig = createModuleConfig({
  folder: "Departments",
  model: "departments",
  title: "Departments",
  subtitle: "Organizational departments",
  singularName: "Department",
  fields: departmentFormFields,
  submitButton: departmentSubmitButton,
  list: {
    hiddenColumns: ["_id", "professionalInfo"],
    populateFields: [
      { path: "attendancePolicy", select: "name" },
      { path: "leavePolicy", select: "name" },
      { path: "designations", select: "title" }
    ],
    customRender: {
      Status: (row) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.Status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {row.Status}
        </span>
      ),
    },
    mapTableData: (item) => {
      return {
        ...item,
        attendancePolicy: item.attendancePolicy?.name || (typeof item.attendancePolicy === "object" ? item.attendancePolicy?.name : item.attendancePolicy) || "-",
        leavePolicy: item.leavePolicy?.name || (typeof item.leavePolicy === "object" ? item.leavePolicy?.name : item.leavePolicy) || "-",
        designations: Array.isArray(item.designations)
          ? item.designations.map(d => typeof d === "object" ? (d.title || d.name) : d).filter(Boolean).join(", ")
          : (item.designations?.title || item.designations?.name || item.designations || "-")
      };
    },
    cleanData: (item) => {
      const { professionalInfo, ...rest } = item;
      return rest;
    },
  },
});
