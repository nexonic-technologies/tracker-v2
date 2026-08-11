import models from "../models/Collection.js";

const ApiHitLog = models.apihit_logs;

export async function apiHitLogger(req, res, next) {
  try {
    await ApiHitLog.create({
      method: req.method,
      path: req.originalUrl,
      user: req.user?._id || null,
      role: req.user?.role || null,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      body: req.body,
      query: req.query,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to save API hit log:", err.message);
    // don't block the request if logging fails
  }
  next();
}