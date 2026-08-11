import jwt from 'jsonwebtoken';
import models from '../models/Collection.js';

const AgentToken = models.agent_tokens;

export const agentAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const source = req.headers['x-source'];
    
    // Skip auth for external login endpoint
    if (source === 'external' && req.path === '/api/agent/login' && req.method === 'POST') {
      return next();
    }
    
    // Skip auth for external requests without token
    if (source === 'external' && !token) {
      return next();
    }
    
    if (source === 'external' && token) {
      // External agent authentication - handle both AgentToken and Agent JWT
      try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.id) {
          return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        // Find session using the token to retrieve the dynamic secret
        const SessionModel = (await import('../models/Session.js')).default;
        const userSession = await SessionModel.findOne({
          userId: decoded.id,
          'generatedToken.token': token,
          status: 'Active'
        });

        const tokenSecret = userSession ? userSession.generatedToken.secret : process.env.JWT_SECRET;
        const verifiedDecoded = jwt.verify(token, tokenSecret);

        if (userSession) {
          userSession.lastUsedAt = new Date();
          await userSession.save();
        }
        // First try AgentToken model
        let agent = await AgentToken.findOne({
          currentSessionToken: token,
          sessionExpiresAt: { $gt: new Date() },
          isActive: true
        });
        
        if (agent) {
          req.agent = {
            agentId: agent.agentId,
            clientId: agent.clientId,
            isExternal: true
          };
          return next();
        }
        
        // Fallback to Agent model for JWT tokens
        const Agent = (await import('../models/Agent.js')).default;
        agent = await Agent.findById(decoded.id).populate('client');
        
        if (agent && agent.isActive) {
          req.agent = {
            agentId: agent._id,
            clientId: agent.client._id,
            isExternal: true,
            email: agent.email,
            name: agent.name
          };
          req.user = {
            id: agent._id,
            _id: agent._id,
            email: agent.email,
            name: agent.name,
            role: 'agent',
            client: agent.client._id
          };
          
          // Auto-set clientId and createdBy for external agent requests
          if (req.body && typeof req.body === 'object') {
            req.body.clientId = agent.client._id;
            req.body.createdBy = agent._id;
            req.body.createdByModel = 'agents';
          }
          
          return next();
        }
        
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        
      } catch (jwtError) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }
    
    // Fall back to regular authentication for internal users
    next();
    
  } catch (error) {
    if (req.headers['x-source'] === 'external') {
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }
    next();
  }
};