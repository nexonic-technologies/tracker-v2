// src/middlewares/maintenanceMiddleware.js
import models from '../models/Collection.js';

const general_settings = models.general_settings;

export async function maintenanceMiddleware(req, res, next) {
  // Exclude auth endpoints to allow admins to login and handle session checks
  const excludedPaths = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/session',
    '/api/config/maintenance',
    '/test'
  ];

  const requestPath = req.path || '';
  if (excludedPaths.some(p => requestPath.startsWith(p))) {
    return next();
  }

  try {
    if (!general_settings) return next();

    const settings = await general_settings.findOne().lean();
    if (!settings) return next();

    const isGlobal = settings.maintenance?.globalEnabled;
    const clientSource = req.headers['x-source'] || 'web';
    const isWeb = settings.maintenance?.webEnabled && clientSource === 'web';
    const isMobile = settings.maintenance?.mobileEnabled && clientSource === 'mobile';

    if (isGlobal || isWeb || isMobile) {
      // Decode user from token if not already parsed
      let user = req.user;
      if (!user) {
        const token = req.cookies?.auth_token || req.headers.authorization?.split(" ")[1];
        if (token) {
          try {
            const jwt = await import('jsonwebtoken');
            const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'tracker_secret');
            user = decoded;
          } catch (jwtErr) {
            // invalid token, treat as guest
          }
        }
      }

      // Per-platform role bypass — no DB lookup, uses req.user.role from JWT
      const userRole = (user?.role || '').toString().toLowerCase().trim();
      const isSuperAdmin = user?.isSuperAdmin === true;

      // Determine which bypass list applies based on the request source platform
      const platform = clientSource === 'mobile' ? 'mobile' : 'web';
      const platformBypass = (settings.maintenance?.bypassRoles?.[platform] || [])
        .map(r => r.toLowerCase().trim());

      const isBypassed = isSuperAdmin || platformBypass.includes(userRole);

      if (!isBypassed) {
        return res.status(503).json({
          success: false,
          maintenance: true,
          message: settings.maintenance.message || 'System is currently undergoing scheduled maintenance.',
          scheduledEnd: settings.maintenance.scheduledEnd || null  // frontend uses for countdown
        });
      }
    }
  } catch (err) {
    console.error("[maintenanceMiddleware] Error checking maintenance status:", err.message);
  }

  next();
}
