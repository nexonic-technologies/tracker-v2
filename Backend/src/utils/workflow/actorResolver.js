import models from "../../models/Collection.js";


/**
 * Resolves a workflow step target (approver or escalated person) into an employee ID.
 * @param {Object} step - The step config containing approverType / escalateToType, specificRoleId, specificUserId
 * @param {String} employeeId - The employee ID associated with the request/document
 * @param {String} departmentId - The department ID associated with the request/document
 * @returns {Promise<String|null>} Resolved employee ID
 */
export async function resolveActor(step, employeeId, departmentId) {
  const actorType = step.actorType || step.approverType || step.escalateToType;

  switch (actorType) {
    case 'Reporting Manager': {
      if (!employeeId) return null;
      const emp = await models.employees.findById(employeeId).select('professionalInfo.reportingManager').lean();
      return emp?.professionalInfo?.reportingManager;
    }
    case 'Department Manager': {
      if (!departmentId) return null;
      const dept = await models.departments.findById(departmentId).select('manager').lean();
      return dept?.manager;
    }
    case 'HR': {
      const hrRole = await models.roles.findOne({ name: { $regex: /HR/i }, isActive: true }).select('_id').lean();
      if (!hrRole) return null;
      const hrEmp = await models.employees.findOne({ 'professionalInfo.role': hrRole._id, status: 'Active' }).select('_id').lean();
      return hrEmp?._id;
    }
    case 'Specific Role': {
      const roleId = step.specificRoleId;
      if (!roleId) return null;
      const roleEmp = await models.employees.findOne({ 'professionalInfo.role': roleId, status: 'Active' }).select('_id').lean();
      return roleEmp?._id;
    }
    case 'Specific User': {
      return step.specificUserId;
    }
    default:
      return null;
  }
}
