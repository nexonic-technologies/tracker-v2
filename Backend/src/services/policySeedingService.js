import models from '../models/Collection.js';

const access_policies = models.access_policies;
const Role = models.roles;


/**
 * Auto-seeds default ABAC policy templates when a new model definition is registered.
 * @param {string} modelName - Model key e.g. "CustomExpense"
 * @param {string} moduleId - Associated module ID
 */
export async function seedDefaultPolicyForModel(modelName, moduleId = 'core') {
  if (!modelName) return [];

  const roles = await Role.find({ isActive: true }).lean();
  const createdPolicies = [];

  for (const role of roles) {
    const isSuperAdmin = role.isSuperAdmin || role.name === 'Super Admin' || role.name === 'CompanyAdmin';
    const isManager = role.name === 'Manager' || role.level >= 5;

    let actions = ['read'];
    if (isSuperAdmin) {
      actions = ['read', 'create', 'update', 'delete', 'list', 'statistics', 'export', 'report'];
    } else if (isManager) {
      actions = ['read', 'create', 'update', 'list', 'statistics'];
    }

    const filter = { role: role._id, modelName };
    const update = {
      role: role._id,
      modelName,
      moduleId,
      actions,
      allowAccess: isSuperAdmin ? ['*'] : ['read'],
      forbiddenAccess: [],
      conditions: {}
    };

    const policy = await access_policies.findOneAndUpdate(filter, update, { upsert: true, new: true }).lean();
    createdPolicies.push(policy);
  }

  return createdPolicies;
}
