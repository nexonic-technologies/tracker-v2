import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import models from '../models/Collection.js';

const AgentToken = models.agent_tokens;

export const agentLogin = async (req, res) => {
  try {
    console.log(req.body);
    const { email, password } = req.body;


    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const agent = await AgentToken.findOne({ email, isActive: true });


    if (!agent) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (agent.lockedUntil && agent.lockedUntil > new Date()) {
      return res.status(423).json({ success: false, message: 'Account temporarily locked' });
    }


    const isValidPassword = await bcrypt.compare(password, agent.password);

    if (!isValidPassword) {
      agent.loginAttempts += 1;
      if (agent.loginAttempts >= 5) {
        agent.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }
      await agent.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const sessionToken = jwt.sign(
      { agentId: agent.agentId, clientId: agent.clientId, level: agent.level },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update agent session
    agent.currentSessionToken = sessionToken;
    agent.sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    agent.lastLoginAt = new Date();
    agent.loginAttempts = 0;
    agent.lockedUntil = undefined;
    await agent.save();

    // console.log('Login successful for agent:', agent.email);
    // console.log('=== LOGIN COMPLETE ===');

    res.json({
      success: true,
      token: sessionToken,
      agentId: agent.agentId,
      clientId: agent.clientId
    });

  } catch (error) {
    console.error('Agent login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

export const agentLogout = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await AgentToken.updateOne(
        { currentSessionToken: token },
        { $unset: { currentSessionToken: 1, sessionExpiresAt: 1 } }
      );
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};