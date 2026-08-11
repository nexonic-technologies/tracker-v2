import { MODULE_DEFINITIONS } from '../models/tenantRegistry.js';

// Reverse map: modelKey -> moduleId
const modelToModuleMap = new Map();
for (const [modId, modelKeys] of Object.entries(MODULE_DEFINITIONS)) {
  if (Array.isArray(modelKeys)) {
    modelKeys.forEach((key) => {
      modelToModuleMap.set(key.toLowerCase(), modId.toLowerCase());
    });
  }
}

/**
 * Module Gate Middleware
 * Verifies that the requested model belongs to an enabled module for the active tenant,
 * and enforces tenant subscription state machine invariants (ACTIVE, PAST_DUE, SUSPENDED, CANCELED).
 */
export const moduleGateMiddleware = async (req, res, next) => {
  try {
    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      return next();
    }

    const modelParam = req.params?.model || req.body?.modelName || req.query?.model;
    if (!modelParam) {
      return next();
    }

    const modelKey = modelParam.toLowerCase();
    const targetModule = modelToModuleMap.get(modelKey) || 'core';

    // Core module models are always accessible
    if (targetModule !== 'core') {
      const enabledModules = tenantContext.enabledModules || ['*'];
      const isAllModules = enabledModules.includes('*');
      const isModuleSubscribed = isAllModules || enabledModules.map(m => m.toLowerCase()).includes(targetModule);

      if (!isModuleSubscribed) {
        return res.status(403).json({
          error: `Access to model '${modelParam}' requires an active '${targetModule}' module license`,
          code: 'MODULE_LICENSE_REQUIRED',
          moduleId: targetModule,
          modelName: modelParam
        });
      }
    }

    // Subscription State Machine Enforcements
    const subscription = tenantContext.subscription || tenantContext.tenant?.subscription || { status: 'ACTIVE' };
    const status = (subscription.status || 'ACTIVE').toUpperCase();

    if (status === 'SUSPENDED') {
      return res.status(402).json({
        error: 'Tenant account is currently suspended. Data Plane APIs are locked until billing/policy resolution.',
        code: 'TENANT_SUSPENDED'
      });
    }

    if (status === 'CANCELED') {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
      if (isMutation) {
        return res.status(403).json({
          error: 'Tenant account subscription is canceled. Database is in read-only mode.',
          code: 'TENANT_CANCELED_READONLY'
        });
      }
    }

    if (status === 'PAST_DUE') {
      res.setHeader('x-subscription-warning', 'PAST_DUE');
    }

    next();
  } catch (err) {
    console.error('[moduleGateMiddleware] Error executing module gate:', err.message);
    return res.status(500).json({ error: 'Module gate evaluation error', details: err.message });
  }
};

export default moduleGateMiddleware;
