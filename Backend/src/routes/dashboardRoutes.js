// routes/dashboardRoutes.js
// Single aggregation endpoint for the dashboard.
// Replaces 6+ separate populate/read calls with one server-side aggregation.
// RULE: Zero hardcoded role names or designation strings.

import express from 'express';
import { getDashboardStats } from '../services/business/dashboardService.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 *
 * Returns all dashboard data for the authenticated user in a single response.
 * The data shape adapts based on the user's role level (1-10):
 *   Level 1-3 → Employee layout (own attendance, tasks, leave balance)
 *   Level 4-6 → Manager layout (team pulse, pending approvals, team grid)
 *   Level 7-8 → Admin/HR layout (org pulse, all approvals, payroll status)
 *   Level 9   → Executive layout (escalations, critical tickets, payroll cost)
 *   Level 10  → MD layout (workforce health, financial exposure, max 3 attention items)
 *
 * Auth: requires valid JWT (authMiddleware applied at mount in index.js)
 * Permissions: each model query respects access_policies — missing read permissions
 *              cause stat omission (not errors).
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.id;
    const roleId = req.user?.role;

    if (!userId || !roleId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const data = await getDashboardStats(userId, roleId);

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
