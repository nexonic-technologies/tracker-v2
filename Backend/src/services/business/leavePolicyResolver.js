// src/services/business/leavePolicyResolver.js
// Single source of truth for resolving an employee's active leave policy
// strictly governed by Department, Designation, Role hierarchy with fallback to Organization Default.

/**
 * Resolves the active leave policy for an employee based on their professionalInfo.
 * Priority hierarchy:
 * 1. Department + Designation Specific Policy (Highest priority)
 * 2. Designation Policy
 * 3. Department Policy
 * 4. Role Policy
 * 5. Organization-wide Active Default Policy / Active Baseline Policy
 *
 * @param {Object} professionalInfo - { department, designation, role, ... }
 * @param {Object} models - Tenant models collection
 * @param {Date} [evalDate=new Date()] - Evaluation date for policy validity
 * @returns {Promise<Object|null>} Resolved LeavePolicy document or null
 */
export async function resolveEmployeeLeavePolicy(professionalInfo, models, evalDate = new Date()) {
  const policyModel = models?.leavepolicy || models?.leave_policies;
  if (!professionalInfo || !policyModel) return null;

  const deptId = professionalInfo.department?._id || professionalInfo.department;
  const desigId = professionalInfo.designation?._id || professionalInfo.designation;
  const roleId = professionalInfo.role?._id || professionalInfo.role;

  const baseDateFilter = {
    $or: [
      { status: 'Active' },
      { isActive: true },
      { status: { $exists: false } }
    ]
  };

  // 1. Department + Designation Specific Policy
  if (deptId && desigId) {
    const comboPolicy = await policyModel.findOne({
      applicableDepartments: deptId,
      applicableDesignations: desigId,
      ...baseDateFilter
    })
      .populate('leaves.leaveType')
      .lean();

    if (comboPolicy && comboPolicy.leaves?.length > 0) return comboPolicy;
  }

  // 2. Designation Policy
  if (desigId) {
    const desigPolicy = await policyModel.findOne({
      applicableDesignations: desigId,
      ...baseDateFilter
    })
      .populate('leaves.leaveType')
      .lean();

    if (desigPolicy && desigPolicy.leaves?.length > 0) return desigPolicy;

    if (models.designations) {
      const desig = await models.designations.findById(desigId)
        .populate({
          path: 'leavePolicy',
          populate: { path: 'leaves.leaveType' }
        })
        .lean();

      if (desig?.leavePolicy && desig.leavePolicy.leaves?.length > 0) return desig.leavePolicy;
    }
  }

  // 3. Department Policy
  if (deptId) {
    const deptPolicy = await policyModel.findOne({
      applicableDepartments: deptId,
      ...baseDateFilter
    })
      .populate('leaves.leaveType')
      .lean();

    if (deptPolicy && deptPolicy.leaves?.length > 0) return deptPolicy;

    if (models.departments) {
      const dept = await models.departments.findById(deptId)
        .populate({
          path: 'leavePolicy',
          populate: { path: 'leaves.leaveType' }
        })
        .lean();

      if (dept?.leavePolicy && dept.leavePolicy.leaves?.length > 0) return dept.leavePolicy;
    }
  }

  // 4. Role Policy
  if (roleId) {
    const rolePolicy = await policyModel.findOne({
      applicableRoles: roleId,
      ...baseDateFilter
    })
      .populate('leaves.leaveType')
      .lean();

    if (rolePolicy && rolePolicy.leaves?.length > 0) return rolePolicy;
  }

  // 5. Organization Default Policy (No specific department, designation, or role restriction)
  const defaultPolicy = await policyModel.findOne({
    $or: [
      { applicableDepartments: { $size: 0 } },
      { applicableDepartments: null },
      { applicableDepartments: { $exists: false } }
    ],
    $or: [
      { applicableDesignations: { $size: 0 } },
      { applicableDesignations: null },
      { applicableDesignations: { $exists: false } }
    ],
    ...baseDateFilter
  })
    .populate('leaves.leaveType')
    .lean();

  if (defaultPolicy && defaultPolicy.leaves?.length > 0) return defaultPolicy;

  // 6. Final Fallback: Any active policy available in tenant database
  const anyActivePolicy = await policyModel.findOne(baseDateFilter)
    .populate('leaves.leaveType')
    .lean();

  return anyActivePolicy || null;
}

export default resolveEmployeeLeavePolicy;
