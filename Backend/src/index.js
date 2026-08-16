import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import AuthRouter from "./routes/authRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import agentInviteRoutes from "./routes/agentInviteRoutes.js";
import populateHelper from "./routes/populateRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import adminSystemRoutes from "./routes/adminSystemRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import ganttRoutes from "./routes/ganttRoutes.js";

import { apiHitLogger } from "./middlewares/apiHitLogger.js";
import { authMiddleware } from "./Controller/AuthController.js";
import { requireGlobalAdmin } from "./middlewares/requireGlobalAdmin.js";
import { agentAuthMiddleware } from "./middlewares/agentAuthMiddleware.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestTracer } from "./middlewares/requestTracer.js";
import { rateLimitMiddleware } from "./middlewares/rateLimitMiddleware.js";
import { raceConditionMiddleware } from "./utils/raceConditionHandler.js";
import { maintenanceMiddleware } from "./middlewares/maintenanceMiddleware.js";
import connectDB from "./Config/ConnectDB.js";
import cookieParser from "cookie-parser";



// Memory optimization
process.env.NODE_OPTIONS = '--max-old-space-size=4096'; // 4GB heap
process.env.UV_THREADPOOL_SIZE = 16; // Increase thread pool

dotenv.config();

// ─── App & Server ────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ─── Scalable Production CORS Setup ──────────────────────────────────────────
const defaultAllowedOrigins = [
  "https://workhub-teal-gamma.vercel.app",
  "https://tracker-v1-chi.vercel.app",
  "https://tracker-v1-rose.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:54979",
  "http://127.0.0.1:5173",
  "http://localhost:5050",
  "http://127.0.0.1:5050",
];

// Combine origins from ALLOWED_ORIGINS & CLIENT_URL env vars + defaults
const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const allowedOriginsSet = new Set(
  [...defaultAllowedOrigins, ...envOrigins].map(o => o.replace(/\/+$/, ""))
);

const lanRegex = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, "");

    if (allowedOriginsSet.has(cleanOrigin) || lanRegex.test(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-uuid', 'deviceuuid', 'x-source', 'x-tenant-id', 'x-tenant-slug'],
  maxAge: 86400
}));

app.use(agentAuthMiddleware);
app.use(requestTracer);
app.use(apiHitLogger);
app.use(rateLimitMiddleware({ enabled: true }));
app.use(raceConditionMiddleware({ enabled: true }));
app.use(maintenanceMiddleware);

import { tenantMiddleware } from "./middlewares/tenantMiddleware.js";
import { moduleGateMiddleware } from "./middlewares/moduleGateMiddleware.js";

// ─── Global Tenant Context Middleware ──────────────────────────────────────
app.use("/api", tenantMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

app.use("/api/agent", agentRoutes);
app.use("/api/agent-invite", agentInviteRoutes);
app.use("/api/auth", AuthRouter);
app.use("/api/populate", moduleGateMiddleware, populateHelper);
app.use("/api/files", authMiddleware, fileRoutes);
app.use("/api", locationRoutes);
app.use("/api/config", authMiddleware, configRoutes);
app.use("/api/admin", authMiddleware, requireGlobalAdmin, adminSystemRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/search", authMiddleware, searchRoutes);
app.use("/api", ganttRoutes); // Gantt queue + ETA recalculation

app.use(errorHandler);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  maxHttpBufferSize: 1e6,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Socket.io Handshake Authentication Guard
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(' ')[1] ||
    socket.handshake.query?.token;

  if (!token) {
    return next(new Error("Authentication required: token missing"));
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "6c1a1fbc732be15f73752642194f0bf19812b2a9cfbdaa59d0f6cb981a208176";
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) {
      return next(new Error("Invalid token payload"));
    }
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error(`Authentication failed: ${err.message}`));
  }
});

const activeConnections = new Map();
const userRooms = new Map();

io.on("connection", (socket) => {
  const authUserId = socket.user?.id?.toString();
  if (authUserId) {
    socket.join(authUserId);
    userRooms.set(socket.id, [authUserId]);
  }

  activeConnections.set(socket.id, {
    userId: authUserId || null,
    connectedAt: Date.now(),
    lastActivity: Date.now()
  });

  socket.on("join", (targetUserId) => {
    if (!targetUserId) return;
    const requested = targetUserId.toString();
    const isOwner = requested === authUserId;
    const isSuperAdmin = socket.user?.isSuperAdmin === true;

    // Disallow joining another user's room unless caller has Super Admin authority
    if (!isOwner && !isSuperAdmin) {
      console.warn(`[Socket.IO] Blocked unauthorized room join attempt from user ${authUserId} to room ${requested}`);
      return;
    }

    const previousRooms = userRooms.get(socket.id) || [];
    previousRooms.forEach(room => socket.leave(room));
    socket.join(requested);
    userRooms.set(socket.id, [requested]);
  });

  socket.on("ticket_typing", async ({ ticketId, isTyping }) => {
    try {
      const connection = activeConnections.get(socket.id);
      if (!connection?.userId) return;
      const { default: models } = await import("./models/Collection.js");
      const participants = await models.ticket_participants.find({ ticketId }).lean();
      if (!participants) return;
      participants.forEach(p => {
        if (p.userId.toString() === connection.userId.toString()) return;
        io.to(p.userId.toString()).emit("ticket_typing", {
          ticketId,
          userId: connection.userId,
          isTyping
        });
      });
    } catch (e) {
      console.error("Error in ticket_typing socket:", e);
    }
  });

  // ─── 1-on-1 Direct Team Chat Sockets ─────────────────────────────────────────
  socket.on("chat_send_message", async (data, ackCallback) => {
    try {
      const connection = activeConnections.get(socket.id);
      const senderId = connection?.userId || data.senderId;
      const { recipientId, message, type = 'text', attachments = [], replyTo } = data;

      if (!senderId || !recipientId || senderId.toString() === recipientId.toString()) {
        if (ackCallback) ackCallback({ error: "Invalid sender or recipient (cannot chat with yourself)" });
        return;
      }

      const conversationId = [senderId.toString(), recipientId.toString()].sort().join('_');
      const { default: models } = await import("./models/Collection.js");

      // Save to MongoDB
      const savedMessage = await models.team_messages.create({
        conversationId,
        sender: senderId,
        recipient: recipientId,
        message,
        type,
        attachments,
        replyTo,
        status: 'sent',
        sentAt: new Date()
      });

      const populatedMsg = await models.team_messages
        .findById(savedMessage._id)
        .populate('sender', 'basicInfo.firstName basicInfo.lastName basicInfo.profileImage')
        .populate('recipient', 'basicInfo.firstName basicInfo.lastName basicInfo.profileImage')
        .lean();

      // Broadcast real-time to recipient room
      io.to(recipientId.toString()).emit("chat_message", populatedMsg);

      // Trigger FCM notification if recipient is not connected
      const isRecipientConnected = Array.from(activeConnections.values()).some(
        c => c.userId?.toString() === recipientId.toString()
      );

      if (!isRecipientConnected) {
        try {
          const { default: NotificationDispatcher } = await import("./utils/notification/NotificationDispatcher.js");
          await NotificationDispatcher.dispatch({
            recipient: recipientId,
            title: `New Message from ${populatedMsg.sender?.basicInfo?.firstName || 'Colleague'}`,
            body: message.length > 80 ? `${message.substring(0, 80)}...` : message,
            type: 'team_chat',
            targetId: conversationId,
          });
        } catch (notifErr) {
          console.warn("[ChatSocket] Push notification dispatch skipped:", notifErr.message);
        }
      }

      if (ackCallback) ackCallback({ success: true, message: populatedMsg });
    } catch (err) {
      console.error("[ChatSocket] Error sending direct chat message:", err);
      if (ackCallback) ackCallback({ error: "Failed to process chat message" });
    }
  });

  socket.on("chat_typing", ({ conversationId, recipientId, isTyping }) => {
    const connection = activeConnections.get(socket.id);
    if (!connection?.userId || !recipientId) return;
    io.to(recipientId.toString()).emit("chat_typing", {
      conversationId,
      senderId: connection.userId,
      isTyping
    });
  });

  socket.on("chat_mark_read", async ({ conversationId, messageIds }, ackCallback) => {
    try {
      const connection = activeConnections.get(socket.id);
      if (!connection?.userId) return;

      const { default: models } = await import("./models/Collection.js");
      const readAt = new Date();

      await models.team_messages.updateMany(
        {
          _id: { $in: messageIds },
          recipient: connection.userId
        },
        {
          $set: { status: 'read', readAt }
        }
      );

      // Notify sender that messages were read
      const sampleMsg = await models.team_messages.findOne({ _id: { $in: messageIds } }).lean();
      if (sampleMsg?.sender) {
        io.to(sampleMsg.sender.toString()).emit("chat_read_receipt", {
          conversationId,
          messageIds,
          readAt
        });
      }

      if (ackCallback) ackCallback({ success: true });
    } catch (err) {
      console.error("[ChatSocket] Error marking messages read:", err);
    }
  });

  socket.on('activity', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) connection.lastActivity = Date.now();
  });

  socket.on("disconnect", (reason) => {
    activeConnections.delete(socket.id);
    userRooms.delete(socket.id);
    if (reason === 'transport error' || reason === 'ping timeout') {
      console.warn(`Socket disconnected due to: ${reason}`);
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    activeConnections.delete(socket.id);
    userRooms.delete(socket.id);
  });
});

// Stale connection cleanup
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000;
  for (const [socketId, connection] of activeConnections.entries()) {
    if (now - connection.lastActivity > staleThreshold) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) socket.disconnect(true);
      activeConnections.delete(socketId);
      userRooms.delete(socketId);
    }
  }
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > 1024 * 1024 * 1024) {
    console.warn('High memory usage:', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      connections: activeConnections.size
    });
  }
}, 60000);

import { initGlobalModels } from "./models/global/index.js";

// Memory leak detection
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn('Memory leak detected:', warning.message);
  }
});

// ─── initApp: called by server.js BEFORE listen() ────────────────────────────
export async function initApp() {
  // 1. Connect to MongoDB — everything else depends on this
  await connectDB();

  // Initialize Global DB models
  initGlobalModels();

  // Populate Application Registry
  try {
    const { default: models } = await import("./models/Collection.js");
    const { registerComponent } = await import("./utils/appRegistry.js");
    const { default: StorageProvider } = await import("./providers/StorageProvider.js");

    for (const [name, model] of Object.entries(models)) {
      registerComponent('models', name, model);
    }
    registerComponent('providers', 'storage', StorageProvider);

    // Seed default general_settings if not present
    try {
      const general_settings = models.general_settings;
      const count = await general_settings.countDocuments();
      if (count === 0) {
        console.log("Seeding default general_settings...");
        await general_settings.create({
          version: 1,
          organization: {
            companyName: "Work Hub ERP",
            branding: { primaryColor: "#6366F1" }
          },
          localization: {
            timezone: "Asia/Kolkata",
            timezoneOffset: 330,
            currency: "INR"
          },
          release: {
            web: { currentVersion: "1.0.0", minimumVersion: "1.0.0", buildNumber: 1 },
            android: { currentVersion: "1.0.0", minimumVersion: "1.0.0", buildNumber: 1 },
            ios: { currentVersion: "1.0.0", minimumVersion: "1.0.0", buildNumber: 1 }
          },
          maintenance: {
            globalEnabled: false,
            webEnabled: false,
            mobileEnabled: false,
            message: "System is currently undergoing scheduled maintenance."
          },
          notification: {
            channels: [
              { event: "ticket_assignment", providers: ["firebase"] },
              { event: "leave_approval", providers: ["firebase", "email"] }
            ]
          },
          payroll: {
            pfCeiling: 15000,
            pfPercent: 12,
            esiThreshold: 21000,
            esiPercent: 0.75
          },
          attendance: {
            workingHours: 8,
            lateGraceMinutes: 15
          },
          storage: {
            activeProvider: "local"
          },
          cron: [
            { jobName: "AttendanceCron", enabled: true, cronExpression: "22 01 * * *", timezone: "Asia/Kolkata" },
            { jobName: "LeaveAccrualCron", enabled: true, cronExpression: "0 0 1 * *", timezone: "Asia/Kolkata" },
            { jobName: "EscalationCron", enabled: true, cronExpression: "0 * * * *", timezone: "Asia/Kolkata" },
            { jobName: "PolicyTransitionCron", enabled: true, cronExpression: "5 0 * * *", timezone: "Asia/Kolkata" },
            { jobName: "OnboardingCron", enabled: true, cronExpression: "30 01 * * *", timezone: "Asia/Kolkata" }
          ]
        });
        console.log("Seeding default general_settings completed successfully.");
      }
    } catch (seedErr) {
      console.error("[initApp] Failed to seed default general_settings:", seedErr.message);
    }

    // Load and Register Cron Jobs
    try {
      const { jobs: attendanceJobs } = await import("./cron/AttendanceCron.js");
      const { jobs: leaveAccrualJobs } = await import("./cron/LeaveAccrualCron.js");
      const { jobs: escalationJobs } = await import("./cron/EscalationCron.js");
      const { jobs: policyTransitionJobs } = await import("./cron/PolicyTransitionCron.js");
      const { jobs: onboardingJobs } = await import("./cron/OnboardingCron.js");

      const allCronJobs = [
        ...(attendanceJobs || []),
        ...(leaveAccrualJobs || []),
        ...(escalationJobs || []),
        ...(policyTransitionJobs || []),
        ...(onboardingJobs || [])
      ];

      for (const job of allCronJobs) {
        registerComponent('cronJobs', job.name, job);
      }
    } catch (cronRegErr) {
      console.error("[initApp] Failed to register cron jobs in registry:", cronRegErr.message);
    }

    // Initialize config-driven scheduler provider
    try {
      const { getComponent } = await import("./utils/appRegistry.js");
      const Scheduler = (await import("./providers/SchedulerProvider.js")).default;
      const general_settings = getComponent('models', 'general_settings');
      const settings = await general_settings.findOne().lean();

      if (settings && Array.isArray(settings.cron)) {
        console.log("[initApp] Initializing scheduler configurations...");
        for (const cronConfig of settings.cron) {
          if (!cronConfig.enabled) {
            console.log(`[initApp] Cron job "${cronConfig.jobName}" is disabled in general_settings.`);
            continue;
          }

          try {
            const registeredJob = getComponent('cronJobs', cronConfig.jobName);
            if (registeredJob && typeof registeredJob.run === 'function') {
              Scheduler.schedule(
                cronConfig.jobName,
                cronConfig.cronExpression || registeredJob.defaultExpression,
                cronConfig.timezone || settings.localization?.timezone || "Asia/Kolkata",
                registeredJob.run
              );
            }
          } catch (jobErr) {
            console.warn(`[initApp] Registered worker not found for cron job "${cronConfig.jobName}":`, jobErr.message);
          }
        }
      }
    } catch (schedErr) {
      console.error("[initApp] Scheduler initialization failed:", schedErr.message);
    }

  } catch (err) {
    console.error("[initApp] Failed to populate Application Registry:", err.message);
  }

  // 2. Initialize cache now that DB is confirmed ready
  try {
    const { setCache } = await import('./utils/cache.js');
    await setCache();
  } catch (error) {
    // Silenced — cache failure is non-fatal
  }

  // 3. Initialize CBAC UI capability cache
  try {
    const { initializeCBACCache } = await import('./utils/cbacCacheService.js');
    await initializeCBACCache();
  } catch (error) {
    // Silenced — CBAC cache failure is non-fatal
  }
}

export { app, server, io, activeConnections };
