// src/middlewares/requireGlobalAdmin.js

/**
 * Middleware to restrict access to Global Control Plane endpoints (/api/admin/*).
 * Only System Platform Owners belonging to the global/admin tenant are permitted.
 */
export const requireGlobalAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const tenantSlug = (req.user.tenantSlug || req.user.tenantId || '').toLowerCase();
  const isGlobalTenant = tenantSlug === 'admin' || tenantSlug === 'default' || req.user.tenantId === 'admin';

  if (!isGlobalTenant) {
    return res.status(403).json({
      success: false,
      message: "⛔ Access Denied: Global Control Plane is restricted to System Platform Owners only."
    });
  }

  next();
};

export default requireGlobalAdmin;
