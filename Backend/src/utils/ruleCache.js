// src/utils/ruleCache.js

let cachedRules = null;

/**
 * Reloads all active notification rules from the database into the memory cache.
 */
export async function reloadRules() {
  try {
    const { getTenantModel } = await import('../tenant/tenantContext.js');
    const NotificationRule = getTenantModel('NotificationRule') || getTenantModel('notificationrules');
    
    if (!NotificationRule) {
      return;
    }

    const rules = await NotificationRule.find({ enabled: true })
      .sort({ priority: -1 }) // Execute higher priority rules first
      .lean();

    cachedRules = rules;
  } catch (_) {
    // Non-blocking
  }
}

/**
 * Retrieves rules matching a specific model name and trigger event.
 * Lazy-loads rules cache if it hasn't been initialized yet.
 * @param {string} modelName 
 * @param {string} trigger 
 * @returns {Promise<Array>}
 */
export async function getRules(modelName, trigger) {
  if (cachedRules === null) {
    await reloadRules();
  }

  const rules = cachedRules || [];
  return rules.filter(rule => 
    rule.modelName === modelName && 
    (rule.trigger === trigger || rule.trigger === 'transition')
  );
}

/**
 * Invalidates the rules memory cache.
 * Call this when a NotificationRule document is created, updated, or deleted.
 */
export function invalidateRules() {
  cachedRules = null;
}
