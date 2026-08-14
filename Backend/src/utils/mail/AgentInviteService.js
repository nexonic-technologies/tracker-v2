import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import models from '../../models/Collection.js';

import mongoose from 'mongoose';

class AgentInviteService {

  // Generate invite token and send email
  async sendInvite(agentId) {
    const agent = await models.agents.findById(agentId).populate('client');
    if (!agent) throw new Error('Agent not found');

    if (agent.hasSetPassword) throw new Error('Agent already has password set');

    // Generate secure token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days

    // Update agent with invite token
    await models.agents.findByIdAndUpdate(agentId, {
      inviteToken,
      inviteExpires,
      isInvited: true
    });

    // Send email
    await this.sendInviteEmail(agent, inviteToken);

    return { success: true, message: 'Invitation sent successfully' };
  }

  // Send invite email
  async sendInviteEmail(agent, token) {
    const email_config = await models.email_configs.findOne();
    if (!email_config || !email_config.enabled) {
      throw new Error('Email service not configured');
    }

    const transporter = nodemailer.createTransport({
      host: email_config.host,
      port: email_config.port,
      secure: email_config.port === 465, // true for 465, false for other ports
      auth: {
        user: email_config.username,
        pass: email_config.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const inviteUrl = `${process.env.NEXTJS_URL || 'http://localhost:3001'}/agent/setup?token=${token}`;

    const mailOptions = {
      from: `"${email_config.fromName}" <${email_config.fromEmail}>`,
      to: agent.email,
      subject: 'Agent Portal Invitation - Set Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to ${agent.client.name} Portal</h2>
          <p>Hello ${agent.name},</p>
          <p>You have been invited to access the client portal. Please click the link below to set your password:</p>
          <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Set Password
          </a>
          <p>This link will expire in 20 days.</p>
          <p>If you didn't expect this invitation, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }

  // Verify invite token
  async verifyInviteToken(token) {
    // Wait for database connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready');
    }

    const agent = await models.agents.findOne({
      inviteToken: token,
      hasSetPassword: { $ne: true }
    });

    // Check expiry manually
    if (agent && agent.inviteExpires <= new Date()) {
      throw new Error('Invitation token has expired');
    }

    if (!agent) {
      throw new Error('Invalid or expired invitation token');
    }

    return agent;
  }

  // Set password using invite token
  async setPassword(token, password) {
    const agent = await this.verifyInviteToken(token);

    await models.agents.findByIdAndUpdate(agent._id, {
      password,
      hasSetPassword: true,
      inviteToken: undefined,
      inviteExpires: undefined,
      isActive: true
    });

    return { success: true, message: 'Password set successfully' };
  }
}

export default new AgentInviteService();