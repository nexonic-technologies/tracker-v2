import { roleFormFields, roleSubmitButton } from "../../../constants/roleForm";
import { createModuleConfig } from "../createModuleConfig";

export const rolesConfig = createModuleConfig({
  folder: "Roles",
  model: "roles",
  title: "Roles",
  subtitle: "Manage user roles and permissions",
  singularName: "Role",
  fields: roleFormFields,
  submitButton: roleSubmitButton,
  transformSubmit: (formData) => ({
    ...formData,
    isActive: formData.isActive === "true" || formData.isActive === true,
  }),
  list: {
    customColumns: ["name", "description", "isActive", "capabilities"],
    hiddenColumns: ["_id", "createdAt", "updatedAt", "__v", "navAccess", "permissions"],
    confirmDelete: (row) => `Delete role "${row.name}"?`,
    customRender: {
      isActive: (row) => (
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            row.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
      capabilities: (row) => (
        <span className="text-ink-muted text-sm">
          {Array.isArray(row.capabilities) ? row.capabilities.length : 0} permissions
        </span>
      ),
    },
  },
});
