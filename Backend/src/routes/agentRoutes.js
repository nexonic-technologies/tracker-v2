import express from 'express';
import models from '../models/Collection.js';

const Agent = models.agents;
const Client = models.clients;
const session = models.sessions;
import { getDeviceInfo } from '../utils/deviceInfo.js';
import { generateSecret } from '../utils/tokenGenrator.js';

const router = express.Router();

// Create agent from client contact person
router.post('/create-agent/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get client details
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (!client.email || !client.contactPerson) {
      return res.status(400).json({
        success: false,
        message: 'Client must have email and contact person'
      });
    }

    // Check if agent already exists
    const existingAgent = await Agent.findOne({ email: client.email });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent already exists for this email'
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Create agent
    const agent = new Agent({
      name: client.contactPerson,
      email: client.email,
      password: tempPassword,
      client: clientId,
      phone: client.phone || 'N/A' // agent model requires phone
    });

    await agent.save();

    // Send email with credentials
    await sendAgentCredentials(client.email, client.contactPerson, tempPassword);

    res.json({
      success: true,
      message: 'Agent created successfully. Credentials sent via email.',
      data: {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        client: client.name
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Agent login
router.post('/login', async (req, res) => {
  try {
    const { email, password, platform = 'web' } = req.body;
    const deviceUUID = req.headers['x-device-uuid'] || req.headers['deviceuuid'] || 'external-client-browser';

    // console.log('=== AGENT LOGIN ATTEMPT (agentRoutes.js) ===');
    // console.log('Email:', email);
    // console.log('Password length:', password ? password.length : 'undefined');
    // console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Find agent
    // console.log('Searching for agent with email:', email);
    const agent = await Agent.findOne({ email, isActive: true }).populate('client');
    // console.log('Agent found:', agent ? 'YES' : 'NO');

    if (agent) {
      // console.log('Agent details:');
      // console.log('- ID:', agent._id);
      // console.log('- Email:', agent.email);
      // console.log('- Name:', agent.name);
      // console.log('- IsActive:', agent.isActive);
      // console.log('- HasPassword:', agent.password ? 'YES' : 'NO');
      // console.log('- Client:', agent.client ? agent.client.name : 'NO CLIENT');
    }

    if (!agent) {
      // console.log('Agent not found - returning invalid credentials');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    // console.log('Comparing passwords...');
    // console.log('Input password:', password);
    // console.log('Stored password:', agent.password);

    let isMatch;
    // Check if password is already hashed (starts with $2b$ or $2a$)
    if (agent.password.startsWith('$2b$') || agent.password.startsWith('$2a$')) {
      // Password is hashed, use bcrypt compare
      isMatch = await agent.comparePassword(password);
    } else {
      // Password is plain text, do direct comparison
      isMatch = password === agent.password;
      // console.log('Plain text password comparison');
    }

    // console.log('Password comparison result:', isMatch);

    if (!isMatch) {
      // console.log('Password mismatch - returning invalid credentials');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // console.log('Password valid - updating last login and generating token');

    // Update last login
    agent.lastLogin = new Date();
    await agent.save();

    // Generate dynamic secret
    const accessSecret = generateSecret();

    // Generate JWT signed with accessSecret
    const token = jwt.sign(
      { id: agent._id, email: agent.email, role: agent.role, client: agent.client._id },
      accessSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Create session document
    const userSession = await session.create({
      userId: agent._id,
      userModel: 'agents',
      platform,
      deviceUUID,
      generatedToken: {
        token,
        secret: accessSecret,
        expiry: process.env.JWT_EXPIRES_IN || '24h'
      },
      deviceInfo: getDeviceInfo(req, platform),
      status: 'Active'
    });

    // console.log('Login successful for agent:', agent.email);
    // console.log('=== LOGIN COMPLETE ===');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      agentId: agent._id,
      clientId: agent.client._id,
      sessionId: userSession._id,
      data: {
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          client: agent.client.name
        },
        token
      }
    });

  } catch (error) {
    console.error('Agent login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all agents
router.get('/agents', async (req, res) => {
  try {
    const agents = await Agent.find().populate('client', 'name email').select('-password');
    res.json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send agent credentials via email
async function sendAgentCredentials(email, name, password) {
  const transporter = nodemailer.createTransporter({
    // Configure your email service
    service: 'gmail', // or your email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Agent Access Credentials - Tracker System',
    html: `
      <h2>Welcome to Tracker System</h2>
      <p>Dear ${name},</p>
      <p>You have been granted agent access to our tracking system.</p>
      <p><strong>Login Credentials:</strong></p>
      <p>Email: ${email}</p>
      <p>Password: ${password}</p>
      <p>Please login and change your password immediately.</p>
      <p>Login URL: ${process.env.NEXTJS_URL || 'http://localhost:3001'}/agent/login</p>
      <br>
      <p>Best regards,<br>Tracker Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

export default router;