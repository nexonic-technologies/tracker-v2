import {
  designationFormFields,
  designationSubmitButton,
} from "@constants/DesignationForm";
import { createModuleConfig } from "../createModuleConfig";

export const designationsConfig = createModuleConfig({
  folder: "Designations",
  model: "designations",
  title: "Designations",
  subtitle: "Manage employee designations",
  singularName: "Designation",
  fields: designationFormFields,
  submitButton: designationSubmitButton,
  list: {
    customColumns: ["title", "attendancePolicy", "leavePolicy", "description"],
    hiddenColumns: ["_id", "createdAt", "updatedAt", "__v", "professionalInfo", "Status"],
    populateFields: [
      { path: "attendancePolicy", select: "name" },
      { path: "leavePolicy", select: "name" }
    ],
    mapTableData: (item) => {
      return {
        ...item,
        attendancePolicy: item.attendancePolicy?.name || (typeof item.attendancePolicy === "object" ? item.attendancePolicy?.name : item.attendancePolicy) || "-",
        leavePolicy: item.leavePolicy?.name || (typeof item.leavePolicy === "object" ? item.leavePolicy?.name : item.leavePolicy) || "-"
      };
    },
    confirmDelete: (row) => `Delete designation "${row.title}"?`,
    cleanData: (item) => {
      const { professionalInfo, ...rest } = item;
      return rest;
    },
  },
});
