import jwt from 'jsonwebtoken';
import models from '../models/Collection.js';

const Session = models.sessions;

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session exists and is active
    const session = await Session.findOne({
      userId: decoded.id,
      'generatedToken.token': token,
      status: 'Active'
    });

    if (!session) {
      // Auto-deactivate any existing sessions for this user if token is invalid
      await Session.updateMany(
        { userId: decoded.id, status: 'Active' },
        { status: 'DeActive', lastUsedAt: new Date() }
      );
      return res.status(403).json({ error: 'Session expired or invalid' });
    }

    // Update last used timestamp
    session.lastUsedAt = new Date();
    await session.save();

    req.user = decoded;
    req.session = session;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      // Auto-deactivate sessions on token errors
      try {
        const decoded = jwt.decode(token);
        if (decoded?.id) {
          await Session.updateMany(
            { userId: decoded.id, status: 'Active' },
            { status: 'DeActive', lastUsedAt: new Date() }
          );
        }
      } catch (decodeErr) {
        // Ignore decode errors
      }
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};