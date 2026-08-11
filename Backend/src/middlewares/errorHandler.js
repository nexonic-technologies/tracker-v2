import models from '../models/Collection.js';
import { sanitizeErrorResponse } from '../utils/errorSanitizer.js';

const ErrorLog = models.error_logs;

export const errorHandler = async (err, req, res, next) => {
  // Log the error to console for server-side visibility
  console.error('🔴 API Error:', err);

  try {
    // save to DB
    await ErrorLog.create({
      message: err.message,
      stack: err.stack,
      method: req.method,
      route: req.originalUrl,
      user: req.user ? req.user.id : null, // if auth attached user
      ip: req.ip,
      requestId: req.id, // Add Request ID for tracing
    });
  } catch (logError) {
    console.error('Failed to save error log:', logError);
  }

  const { statusCode, payload } = sanitizeErrorResponse(err, req);
  return res.status(statusCode).json(payload);
};