import admin from 'firebase-admin';
import models from '../models/Collection.js';
import JobQueue from './jobQueue.js';
import { decrypt } from '../utils/cryptoHelper.js';


// ─── Firebase Dynamic Initialization ─────────────────────────────────────────
let firebaseReady = false;
let firebaseAdminApp = null;

export async function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;

  // 1. Try default credentials first
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      firebaseAdminApp = admin.initializeApp();
      firebaseReady = true;
      console.log('[FCM] Firebase Admin SDK initialized using GOOGLE_APPLICATION_CREDENTIALS.');
      return firebaseAdminApp;
    } catch (error) {
      console.warn('[FCM] Failed to initialize default credentials app:', error.message);
    }
  }

  // 2. Fallback to database-stored encrypted service account key
  try {
    const settings = await models.general_settings.findOne().lean();
    const encKey = settings?.notification?.firebase?.serviceAccountKeyEncrypted;
    if (encKey) {
      const decJson = decrypt(encKey);
      const serviceAccount = JSON.parse(decJson);
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseReady = true;
      console.log('[FCM] Firebase Admin SDK initialized dynamically using database credentials.');
      return firebaseAdminApp;
    }
  } catch (error) {
    console.warn('[FCM] Dynamic database-driven initialization failed:', error.message);
  }

  return null;
}


// ─── Non-retriable error patterns ────────────────────────────────────────────
// These indicate missing configuration, not transient network issues.
// Retrying them wastes cycles — mark as failed immediately.
const NON_RETRIABLE_PATTERNS = [
  'Unable to detect a Project Id',
  'Could not load the default credentials',
  'invalid_grant',
  'CERTIFICATE_VERIFY_FAILED',
];

function isNonRetriableError(error) {
  const msg = error?.message || '';
  return NON_RETRIABLE_PATTERNS.some(p => msg.includes(p));
}

// ─── Job Queue ────────────────────────────────────────────────────────────────
const fcmQueue = new JobQueue({
  concurrency: 5,
  batchSize: 100,
  retryAttempts: 3,
  retryDelay: 5000,
});

// Log queue-level failures once (not per retry)
fcmQueue.on('job:failed', ({ job, error }) => {
  console.warn(
    `[FCM] Push job permanently failed after ${job.attempts} attempt(s). ` +
    `This does NOT affect any data workflow.\n  Error: ${error?.message}`
  );
});

// ─── FCMService ───────────────────────────────────────────────────────────────
class FCMService {
  /**
   * Sends a multicast push via Firebase and updates NotificationReceptionist records.
   * Throws on transient errors so the JobQueue can retry.
   * Does NOT throw on configuration / credential errors — marks as failed and returns.
   */
  async sendMulticast(contentDoc, receptionistDocs, tokens) {
    const receptionistIds = receptionistDocs.map(r => r._id);

    // Try dynamic/env initialization first
    await getFirebaseAdmin();

    // ── Guard: Firebase not ready ──────────────────────────────────────────
    if (!firebaseReady) {
      console.warn('[FCM] sendMulticast skipped: Firebase not initialised (Credentials missing in database/env).');
      await models.NotificationReceptionist.updateMany(
        { _id: { $in: receptionistIds } },
        { $set: { fcmStatus: 'failed', fcmErrorReason: 'Firebase not configured in this environment' } }
      ).catch(() => { }); // best-effort
      return; // do NOT throw — this is a config issue, not a runtime failure
    }

    // ── Guard: No tokens ───────────────────────────────────────────────────
    if (!tokens || tokens.length === 0) {
      await models.NotificationReceptionist.updateMany(
        { _id: { $in: receptionistIds } },
        { $set: { fcmStatus: 'failed', fcmErrorReason: 'No FCM token registered' } }
      ).catch(() => { });
      return;
    }

    const payload = {
      notification: {
        title: contentDoc.title,
        body: contentDoc.message,
      },
      data: {
        type: contentDoc.type,
        model: contentDoc.meta?.model || '',
        modelId: contentDoc.meta?.modelId?.toString() || '',
        notificationId: contentDoc._id.toString(),
      },
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(payload);

      if (response.failureCount === 0) {
        await models.NotificationReceptionist.updateMany(
          { _id: { $in: receptionistIds } },
          { $set: { fcmStatus: 'sent' } }
        );
      } else {
        const successIds = [];
        const failedItems = [];

        response.responses.forEach((resp, idx) => {
          if (resp.success) {
            successIds.push(receptionistDocs[idx]?._id);
          } else {
            failedItems.push({
              id: receptionistDocs[idx]?._id,
              error: resp.error?.message || 'Unknown FCM error',
            });
          }
        });

        if (successIds.length > 0) {
          await models.NotificationReceptionist.updateMany(
            { _id: { $in: successIds.filter(Boolean) } },
            { $set: { fcmStatus: 'sent' } }
          );
        }

        for (const failure of failedItems) {
          if (failure.id) {
            await models.NotificationReceptionist.updateOne(
              { _id: failure.id },
              { $set: { fcmStatus: 'failed', fcmErrorReason: failure.error } }
            );
          }
        }
      }
    } catch (error) {
      // ── Non-retriable config errors ──────────────────────────────────────
      if (isNonRetriableError(error)) {
        console.warn(
          `[FCM] Push skipped — environment not configured for FCM. ` +
          `Workflow data is unaffected.\n  Reason: ${error.message}`
        );
        await models.NotificationReceptionist.updateMany(
          { _id: { $in: receptionistIds } },
          { $set: { fcmStatus: 'failed', fcmErrorReason: `Config error: ${error.message}` } }
        ).catch(() => { });
        return; // do NOT rethrow — no point retrying a config problem
      }

      // ── Transient errors: let the queue retry ────────────────────────────
      console.warn(`[FCM] Transient send error — will retry. Reason: ${error.message}`);
      await models.NotificationReceptionist.updateMany(
        { _id: { $in: receptionistIds } },
        { $set: { fcmStatus: 'failed', fcmErrorReason: error.message } }
      ).catch(() => { });
      throw error; // rethrow so JobQueue schedules a retry
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  /**
   * Creates a Notification + NotificationReceptionist records and queues a push.
   * NEVER throws — any failure is logged and the calling workflow continues.
   */
  async dispatchNotification({ type, title, message, sender, meta, receiversArray }) {
    try {
      // ─── Centralized Dynamic Notification Bypass Check ───────────────────────
      const settings = await models.general_settings.findOne().lean();
      if (settings?.notification?.useDynamicNotifications) {
        return; // Bypassed: dynamic rules evaluator is active
      }

      if (!receiversArray || receiversArray.length === 0) return;

      // Deduplicate and remove sender from receivers
      let receiverIds = [...new Set(receiversArray.map(id => id.toString()))];
      if (sender) {
        receiverIds = receiverIds.filter(id => id !== sender.toString());
      }
      if (receiverIds.length === 0) return;

      // Normalise notification type to allowed schema enum
      const TYPE_MAPPING = {
        attendance_request: 'system',
        regularization_request: 'system',
        regularizations_request: 'system',
        regularizations_status: 'system',
        leaves_request: 'leave',
        leaves_status: 'leave',
        leave_request: 'leave',
        leave_response: 'leave',
        task_comment: 'comment',
        task_mention: 'mention',
      };
      const ALLOWED_TYPES = ['post', 'mention', 'reaction', 'comment', 'ticket', 'task', 'leave', 'system'];
      let resolvedType = TYPE_MAPPING[type] || type;
      if (!ALLOWED_TYPES.includes(resolvedType)) resolvedType = 'system';

      // 1. Persist the notification content record
      const contentDoc = await models.notifications.create({
        type: resolvedType,
        title,
        message,
        sender: sender || undefined,
        meta,
      });

      // 2. Fetch active FCM tokens for receivers
      const sessions = await models.session.find({
        userId: { $in: receiverIds },
        status: 'Active',
        fcmToken: { $ne: null },
      }).select('userId fcmToken').lean();

      // 3. Create NotificationReceptionist records (one per receiver)
      const receptionistPayloads = receiverIds.map(uid => ({
        notificationId: contentDoc._id,
        receiver: uid,
        fcmStatus: 'pending',
      }));

      const receptionistDocs = await models.NotificationReceptionist.insertMany(receptionistPayloads);

      // 4. Collect tokens and enqueue push (fully async — no await)
      const tokens = sessions.map(s => s.fcmToken).filter(Boolean);

      fcmQueue.add({
        handler: async (data) => {
          await this.sendMulticast(data.contentDoc, data.receptionistDocs, data.tokens);
        },
        data: { contentDoc, receptionistDocs, tokens },
      });

    } catch (err) {
      // Log to audit but do NOT propagate — workflow must continue
      console.warn(
        `[FCM] dispatchNotification failed (non-blocking). Workflow unaffected.\n` +
        `  Type: ${type} | Error: ${err.message}`
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  /**
   * Dispatches push + offline email for ticket events.
   * NEVER throws — both paths are independently guarded.
   */
  async dispatchTicketNotification({ type, title, message, sender, meta, receiversArray }) {
    // Push notification (fire-and-forget, already guarded inside dispatchNotification)
    await this.dispatchNotification({ type, title, message, sender, meta, receiversArray });

    // Offline email — completely independent, must not affect push or caller
    this._sendOfflineEmails({ title, message, sender, receiversArray }).catch(err => {
      console.warn(
        `[FCM] Offline email dispatch failed (non-blocking). Workflow unaffected.\n` +
        `  Error: ${err.message}`
      );
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  /**
   * Internal: sends email to offline ticket participants.
   * Extracted so dispatchTicketNotification can fire-and-forget it.
   */
  async _sendOfflineEmails({ title, message, sender, receiversArray }) {
    if (!receiversArray || receiversArray.length === 0) return;

    let receiverIds = [...new Set(receiversArray.map(id => id.toString()))];
    if (sender) receiverIds = receiverIds.filter(id => id !== sender.toString());
    if (receiverIds.length === 0) return;

    const { default: nodemailer } = await import('nodemailer');

    const activeSessions = await models.session.find({
      userId: { $in: receiverIds },
      status: 'Active',
    }).select('userId').lean();

    const activeUserIds = new Set(activeSessions.map(s => s.userId.toString()));
    const offlineUserIds = receiverIds.filter(id => !activeUserIds.has(id));
    if (offlineUserIds.length === 0) return;

    const [offlineEmployees, offlineAgents] = await Promise.all([
      models.employees.find({ _id: { $in: offlineUserIds } })
        .select('basicInfo.firstName basicInfo.lastName authInfo.workEmail').lean(),
      models.agents.find({ _id: { $in: offlineUserIds } })
        .select('name email').lean(),
    ]);

    const emailRecipients = [];
    offlineEmployees.forEach(emp => {
      if (emp.authInfo?.workEmail) {
        emailRecipients.push({
          name: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim(),
          email: emp.authInfo.workEmail,
        });
      }
    });
    offlineAgents.forEach(agent => {
      if (agent.email) emailRecipients.push({ name: agent.name, email: agent.email });
    });

    if (emailRecipients.length === 0) return;

    const email_config = await models.email_configs.findOne();
    if (!email_config || !email_config.enabled) {
      console.warn('[FCM] Offline email skipped: SMTP not configured or disabled.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: email_config.host,
      port: email_config.port,
      secure: email_config.port === 465,
      auth: { user: email_config.username, pass: email_config.password },
      tls: { rejectUnauthorized: false },
    });

    await Promise.allSettled(
      emailRecipients.map(async (recipient) => {
        try {
          await transporter.sendMail({
            from: `"${email_config.fromName}" <${email_config.fromEmail}>`,
            to: recipient.email,
            subject: title,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;padding:20px;border-radius:8px;">
                <h2 style="color:#333333;">${title}</h2>
                <p>Hello ${recipient.name},</p>
                <p>You have a new update regarding a ticket:</p>
                <blockquote style="background:#f9f9f9;border-left:4px solid #007bff;padding:10px 15px;margin:20px 0;">
                  ${message}
                </blockquote>
                <p>Please log in to the portal to view the details.</p>
                <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
                <p style="font-size:12px;color:#777;">This is an automated notification. Please do not reply directly.</p>
              </div>
            `,
          });
          console.log(`[FCM] Offline email sent to ${recipient.email}`);
        } catch (err) {
          console.warn(`[FCM] Failed to send offline email to ${recipient.email}: ${err.message}`);
        }
      })
    );
  }

  enqueueMulticast(contentDoc, receptionistDocs, tokens) {
    fcmQueue.add({
      handler: async (data) => {
        await this.sendMulticast(data.contentDoc, data.receptionistDocs, data.tokens);
      },
      data: { contentDoc, receptionistDocs, tokens },
    });
  }
}

export default new FCMService();
