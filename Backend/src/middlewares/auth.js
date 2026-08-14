import jwt from 'jsonwebtoken';
import models from '../models/Collection.js';

const Session = models.sessions;

// Fast in-memory session validation cache (TTL: 30s) to eliminate remote DB lookups on every hit
const sessionAuthCache = new Map();
const SESSION_CACHE_TTL_MS = 30 * 1000;

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check in-memory session cache
    const cacheKey = `${decoded.id}:${token}`;
    const cached = sessionAuthCache.get(cacheKey);
    const now = Date.now();

    let session = null;
    if (cached && (now - cached.timestamp < SESSION_CACHE_TTL_MS)) {
      session = cached.session;
    } else {
      // Check if session exists and is active in DB
      session = await Session.findOne({
        userId: decoded.id,
        'generatedToken.token': token,
        status: 'Active'
      }).lean();

      if (!session) {
        sessionAuthCache.delete(cacheKey);
        // Auto-deactivate any existing sessions for this user if token is invalid
        Session.updateMany(
          { userId: decoded.id, status: 'Active' },
          { status: 'DeActive', lastUsedAt: new Date() }
        ).catch(() => {});
        return res.status(403).json({ error: 'Session expired or invalid' });
      }

      sessionAuthCache.set(cacheKey, { session, timestamp: now });
    }

    // Update last used timestamp asynchronously in the background (non-blocking)
    if (!cached || (now - cached.timestamp >= 10000)) {
      Session.updateOne(
        { _id: session._id },
        { $set: { lastUsedAt: new Date() } }
      ).catch(() => {});
    }

    req.user = decoded;
    req.session = session;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.id) {
          sessionAuthCache.delete(`${decoded.id}:${token}`);
          Session.updateMany(
            { userId: decoded.id, status: 'Active' },
            { status: 'DeActive', lastUsedAt: new Date() }
          ).catch(() => {});
        }
      } catch (_) {}
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};