import createQueue from '../queueFactory.js';

class AsyncNotificationService {
  constructor() {
    this.pushQueue = createQueue('push notifications');
    this.emailQueue = createQueue('email notifications');

    this.setupProcessors();
    this.setupEventHandlers();
  }

  setupProcessors() {
    // Push notification processor
    this.pushQueue.process('send-push', 10, async (job) => {
      const { userId, title, body, data } = job.data;
      return await this.processPushNotification(userId, title, body, data);
    });

    // Email processor
    this.emailQueue.process('send-email', 5, async (job) => {
      const { to, subject, body, template } = job.data;
      return await this.processEmail(to, subject, body, template);
    });

    // Batch notification processor
    this.pushQueue.process('batch-push', 5, async (job) => {
      const { notifications } = job.data;
      return await this.processBatchPush(notifications);
    });
  }

  // Queue email (non-blocking)
  async queueEmail(to, subject, body, template = null, options = {}) {
    try {
      const job = await this.emailQueue.add('send-email', {
        to,
        subject,
        body,
        template,
        timestamp: Date.now()
      }, {
        delay: options.delay || 0,
        attempts: 3,
        backoff: { type: 'fixed', delay: 1800000 }, // 30 minutes between retries
        removeOnComplete: 20,
        removeOnFail: 50
      });

      return { success: true, jobId: job.id };
    } catch (error) {
      console.error('Error queuing email:', error);
      return { success: false, error: error.message };
    }
  }

  setupEventHandlers() {
    this.pushQueue.on('error', (err) => {
      console.warn('⚠️ Push Queue Redis error:', err.message);
    });

    this.emailQueue.on('error', (err) => {
      console.warn('⚠️ Email Queue Redis error:', err.message);
    });

    this.pushQueue.on('completed', (job) => {
      // console.log(`Push notification job ${job.id} completed`);
    });

    this.pushQueue.on('failed', (job, err) => {
      console.error(`Push notification job ${job.id} failed:`, err);
    });

    this.emailQueue.on('completed', (job) => {
      // console.log(`Email job ${job.id} completed`);
    });

    this.emailQueue.on('failed', async (job, err) => {
      console.error(`Email job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`, err.message);

      // On final failed attempt (3 tries exhausted), log to ErrorLog for persistent operational visibility
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        try {
          const { default: ErrorLog } = await import('../../models/ErrorLog.js');
          await ErrorLog.create({
            message: `[EmailQueuePermanentFailure] Failed to deliver email to ${job.data?.to}: ${err.message}`,
            stack: err.stack || err.message,
            level: 'ERROR',
            metadata: {
              jobId: job.id,
              recipient: job.data?.to,
              subject: job.data?.subject,
              attemptsMade: job.attemptsMade
            }
          });
        } catch (eErr) {
          console.error('[AsyncNotificationService] Failed to write ErrorLog on permanent email failure:', eErr.message);
        }
      }
    });
  }

  // Queue batch notifications
  async queueBatchNotifications(notifications, options = {}) {
    try {
      const job = await this.pushQueue.add('batch-push', {
        notifications,
        timestamp: Date.now()
      }, {
        delay: options.delay || 0,
        attempts: 3,
        backoff: 'exponential',
        removeOnComplete: 5,
        removeOnFail: 3
      });

      return { success: true, jobId: job.id };
    } catch (error) {
      console.error('Error queuing batch notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Process individual push notification
  async processPushNotification(userId, title, body, data) {
    try {
      // Get user's push tokens from database
      const { default: Session } = await import('../../models/Session.js');
      const sessions = await Session.find({
        userId,
        isActive: true,
        pushToken: { $exists: true, $ne: null }
      }).select('pushToken deviceType').lean();

      const userTokens = sessions.map(s => ({
        token: s.pushToken,
        type: s.deviceType
      }));

      if (!userTokens || userTokens.length === 0) {
        return { success: false, reason: 'No push tokens found' };
      }

      // Send to external push service (mock implementation)
      const results = await Promise.allSettled(
        userTokens.map(({ token, type }) =>
          this.sendPushToProvider(token, title, body, data, type)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: successful > 0,
        sent: successful,
        failed,
        total: userTokens.length
      };

    } catch (error) {
      console.error('Error processing push notification:', error);
      throw error;
    }
  }

  // Mock external push service call
  async sendPushToProvider(token, title, body, data, deviceType) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock success/failure (90% success rate)
    if (Math.random() < 0.9) {
      return { success: true, token, messageId: Date.now() };
    } else {
      throw new Error('Push service unavailable');
    }
  }

  // Process batch notifications
  async processBatchPush(notifications) {
    try {
      const results = await Promise.allSettled(
        notifications.map(notif =>
          this.processPushNotification(
            notif.userId,
            notif.title,
            notif.body,
            notif.data
          )
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        processed: notifications.length,
        successful,
        failed
      };

    } catch (error) {
      console.error('Error processing batch notifications:', error);
      throw error;
    }
  }

  // Process email via real SMTP
  async processEmail(to, subject, body, template) {
    try {
      const { default: EmailConfig } = await import('../../models/email_config.js');
      const nodemailer = (await import('nodemailer')).default;

      const email_config = await EmailConfig.findOne().lean();
      if (!email_config || !email_config.enabled) {
        throw new Error('SMTP email service is disabled or not configured in general_settings/email_config.');
      }

      const transporter = nodemailer.createTransport({
        host: email_config.host,
        port: email_config.port,
        secure: email_config.port === 465,
        auth: {
          user: email_config.username,
          pass: email_config.password
        },
        tls: { rejectUnauthorized: false }
      });

      const info = await transporter.sendMail({
        from: email_config.fromEmail || email_config.username,
        to,
        subject,
        html: body
      });

      return {
        success: true,
        messageId: info.messageId,
        to,
        subject
      };
    } catch (error) {
      console.error('[AsyncNotificationService] SMTP email delivery error:', error.message);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const [pushWaiting, pushActive, pushCompleted, pushFailed] = await Promise.all([
        this.pushQueue.getWaiting(),
        this.pushQueue.getActive(),
        this.pushQueue.getCompleted(),
        this.pushQueue.getFailed()
      ]);

      const [emailWaiting, emailActive, emailCompleted, emailFailed] = await Promise.all([
        this.emailQueue.getWaiting(),
        this.emailQueue.getActive(),
        this.emailQueue.getCompleted(),
        this.emailQueue.getFailed()
      ]);

      return {
        push: {
          waiting: pushWaiting.length,
          active: pushActive.length,
          completed: pushCompleted.length,
          failed: pushFailed.length
        },
        email: {
          waiting: emailWaiting.length,
          active: emailActive.length,
          completed: emailCompleted.length,
          failed: emailFailed.length
        }
      };

    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { error: error.message };
    }
  }

  // Clean old jobs
  async cleanOldJobs() {
    try {
      await Promise.all([
        this.pushQueue.clean(24 * 60 * 60 * 1000, 'completed'), // 24 hours
        this.pushQueue.clean(24 * 60 * 60 * 1000, 'failed'),
        this.emailQueue.clean(24 * 60 * 60 * 1000, 'completed'),
        this.emailQueue.clean(24 * 60 * 60 * 1000, 'failed')
      ]);

      // console.log('✅ Old notification jobs cleaned');
    } catch (error) {
      console.error('Error cleaning old jobs:', error);
    }
  }

  // Graceful shutdown
  async shutdown() {
    try {
      await Promise.all([
        this.pushQueue.close(),
        this.emailQueue.close()
      ]);
      // console.log('✅ Notification queues closed');
    } catch (error) {
      console.error('Error closing notification queues:', error);
    }
  }
}

export default new AsyncNotificationService();