// Backend/src/services/authService.js
import { getPolicy, getRoleMeta } from '../utils/cache.js';
import validator from '../utils/Validator.js';
import cbacResolutionService from './cbacResolutionService.js';

/**
 * Centralized Authorization Service
 */

export async function can(user, action, modelName, docId = null, body = null) {
  const role = user?.role || user?.professionalInfo?.role;
  if (!role || !modelName) return false;

  const roleMeta = getRoleMeta(role);
  const isSuperAdmin = !!roleMeta?.isSuperAdmin || role === 'super admin';

  if (isSuperAdmin) return true;

  const policy = getPolicy(role, modelName);
  if (!policy) return false;

  try {
    validator({
      action,
      modelName,
      role,
      userId: user.id || user._id,
      docId,
      body,
      policy,
      getPolicy
    });
    return true;
  } catch (err) {
    return false;
  }
}

export function canUpdateField(user, modelName, field, docId = null) {
  const role = user?.role || user?.professionalInfo?.role;
  if (!role || !modelName) return false;

  const roleMeta = getRoleMeta(role);
  if (roleMeta?.isSuperAdmin || role === 'super admin') return true;

  const policy = getPolicy(role, modelName);
  if (!policy) return false;

  const blocked = policy.forbiddenAccess?.update || [];
  const allowed = policy.allowAccess?.update || [];

  // Match helper supporting dot-notation matching
  const match = (f, rule) => f === rule || f.startsWith(rule + '.') || rule.startsWith(f + '.');

  const isBlocked = blocked.some(b => match(field, b));
  if (isBlocked) return false;

  if (allowed.length && !allowed.includes('*')) {
    return allowed.some(a => match(field, a));
  }

  return true;
}

export function canReadUnrestricted(user, modelName) {
  const role = user?.role || user?.professionalInfo?.role;
  if (!role || !modelName) return false;

  const roleMeta = getRoleMeta(role);
  if (roleMeta?.isSuperAdmin || role === 'super admin') return true;

  const policy = getPolicy(role, modelName);
  if (!policy) return false;

  if (!policy.permissions?.read) return false;

  // If there are conditions on read, it's restricted
  const conditions = policy.conditions?.read;
  if (conditions && conditions.length > 0) {
    return false;
  }

  return true;
}

export async function hasCapability(user, key) {
  return cbacResolutionService.hasCapability(user, key);
}

// Default export factory function for Service Hooks registry compliance
export default function authService() {
  return {
    can,
    canUpdateField,
    canReadUnrestricted,
    hasCapability
  };
}
