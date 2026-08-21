// routes/dashboardRoutes.js
// Dashboard stats aggregation endpoint.
// Security context is resolved dynamically through policyEngine.resolvePolicy() —
// the same engine used by the Populate Pipeline. Zero hardcoded role strings or level gates.

import express from 'express';
import { getDashboardStats } from '../services/business/dashboardService.js';
import { resolvePolicy } from '../utils/policy/policyEngine.js';

const router = express.Router();

const DASHBOARD_MODELS = [
  'attendances',
  'employees',
  'tasks',
  'leaves',
  'regularizations',
  'wfh_requests',
  'comp_off_requests',
  'tickets',
  'payroll_runs',
  'payrolls',
  'assets',
  'assets_allocations'
];

/**
 * GET /api/dashboard/stats
 *
 * Resolves SecurityCtx via policyEngine.resolvePolicy() for all relevant models
 * against tenant policies and schema flags, then delegates to getDashboardStats.
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.id;
    const roleId = req.user?.role;

    if (!userId || !roleId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Resolve policies dynamically for all dashboard entities via Policy Engine
    const policyResults = await Promise.all(
      DASHBOARD_MODELS.map(model =>
        resolvePolicy({ user: req.user, tenantContext: req.tenantContext }, model)
      )
    );

    const policyMap = new Map();
    DASHBOARD_MODELS.forEach((model, index) => {
      policyMap.set(model.toLowerCase(), policyResults[index]);
    });

    /**
     * SecurityCtx — Pure declarative security contract.
     * Evaluates access strictly through dynamic Policy Engine contracts.
     */
    const secCtx = {
      userId,
      user: req.user,
      tenantContext: req.tenantContext,
      getPolicy(modelName) {
        return policyMap.get(modelName.toLowerCase()) || null;
      },
      canRead(modelName) {
        const p = this.getPolicy(modelName);
        return !!p?.permissions?.read;
      },
      hasFullRead(modelName) {
        const p = this.getPolicy(modelName);
        if (!p?.permissions?.read) return false;
        if (p?.isSuperAdmin) return true;
        return (
          p?.allowAccess?.read?.includes('*') ||
          (!p?.forbiddenAccess?.read?.length && (!p?.conditions || Object.keys(p.conditions).length === 0))
        );
      },
    };

    const { startDate, endDate, range } = req.query;
    const data = await getDashboardStats(userId, secCtx, { startDate, endDate, range });

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Dashboard] Stats aggregation error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute dashboard stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

