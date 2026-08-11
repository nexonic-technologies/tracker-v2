import express from 'express';
import cors from 'cors';
import AgentInviteService from '../services/AgentInviteService.js';

const router = express.Router();

// Enable CORS for these routes
router.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Verify invite token (for Next.js) - No auth required
router.get('/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    // console.log('Verifying token:', token);

    const agent = await AgentInviteService.verifyInviteToken(token);
    // console.log('Agent found:', agent ? agent.email : 'null');

    res.json({
      success: true,
      agent: {
        name: agent.name,
        email: agent.email,
        client: agent.client
      }
    });
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Set password using invite token (for Next.js) - No auth required
router.post('/set-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await AgentInviteService.setPassword(token, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;