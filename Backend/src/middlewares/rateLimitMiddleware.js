import { getFingerprintKey } from '../utils/deviceFingerprint.js';

/**
 * Rate Limiter with Device Fingerprinting
 * AWS API Gateway-style rate limiting with per-device limits
 * 
 * Features:
 * - Per-device fingerprint tracking
 * - Sliding window rate limiting
 * - Burst allowance
 * - Distributed tracking support
 */
class RateLimiter {
  constructor(options = {}) {
    this.limits = new Map(); // In-memory storage for fingerprint -> rate data
    
    // Configuration
    this.config = {
      // Request limits per time window
      requestsPerSecond: options.requestsPerSecond || 10,
      requestsPerMinute: options.requestsPerMinute || 300,
      requestsPerHour: options.requestsPerHour || 3600,
      
      // Burst allowance (can exceed per-second limit briefly)
      burstAllowance: options.burstAllowance || 1.5,
      
      // Cleanup old records (default 1 hour)
      cleanupInterval: options.cleanupInterval || 60 * 60 * 1000,
      
      // Per-route overrides
      routeOverrides: options.routeOverrides || {},
      
      // Whitelist (bypass rate limiting)
      whitelist: options.whitelist || [],
      
      // Actions to take when rate limit exceeded
      onLimitExceeded: options.onLimitExceeded || 'throttle'
    };

    this.startCleanup();
  }

  /**
   * Check if request is within rate limits
   */
  checkLimit(fingerprint, routeKey = 'default') {
    const now = Date.now();
    const limits = this.getRouteLimits(routeKey);

    if (!this.limits.has(fingerprint)) {
      this.limits.set(fingerprint, {
        requests: [],
        violations: 0,
        lastReset: now,
        blocked: false,
        blockedUntil: null
      });
    }

    const record = this.limits.get(fingerprint);

    // Check if temporarily blocked
    if (record.blocked && now < record.blockedUntil) {
      return {
        allowed: false,
        reason: 'device_temporarily_blocked',
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
        violations: record.violations
      };
    }

    // Unblock if time has passed
    if (record.blocked && now >= record.blockedUntil) {
      record.blocked = false;
      record.blockedUntil = null;
      record.violations = Math.max(0, record.violations - 1);
    }

    // Remove old requests outside our time windows
    const oneHourAgo = now - 3600000;
    const oneMinuteAgo = now - 60000;
    const oneSecondAgo = now - 1000;

    record.requests = record.requests.filter(time => time > oneHourAgo);

    // Count requests in each window
    const requestsLastSecond = record.requests.filter(time => time > oneSecondAgo).length;
    const requestsLastMinute = record.requests.filter(time => time > oneMinuteAgo).length;
    const requestsLastHour = record.requests.length;

    // Check limits
    const secondLimit = limits.requestsPerSecond * this.config.burstAllowance;
    const minuteLimit = limits.requestsPerMinute;
    const hourLimit = limits.requestsPerHour;

    if (requestsLastSecond >= secondLimit) {
      this.recordViolation(fingerprint, 'second_limit', now);
      return {
        allowed: false,
        reason: 'rate_limit_exceeded_second',
        limit: limits.requestsPerSecond,
        current: requestsLastSecond,
        retryAfter: 1,
        violations: record.violations + 1
      };
    }

    if (requestsLastMinute >= minuteLimit) {
      this.recordViolation(fingerprint, 'minute_limit', now);
      return {
        allowed: false,
        reason: 'rate_limit_exceeded_minute',
        limit: limits.requestsPerMinute,
        current: requestsLastMinute,
        retryAfter: 60,
        violations: record.violations + 1
      };
    }

    if (requestsLastHour >= hourLimit) {
      this.recordViolation(fingerprint, 'hour_limit', now);
      return {
        allowed: false,
        reason: 'rate_limit_exceeded_hour',
        limit: limits.requestsPerHour,
        current: requestsLastHour,
        retryAfter: 3600,
        violations: record.violations + 1
      };
    }

    // Request allowed - record it
    record.requests.push(now);

    return {
      allowed: true,
      remaining: {
        second: Math.max(0, limits.requestsPerSecond - requestsLastSecond - 1),
        minute: Math.max(0, limits.requestsPerMinute - requestsLastMinute - 1),
        hour: Math.max(0, limits.requestsPerHour - requestsLastHour - 1)
      },
      resetAt: {
        second: now + 1000,
        minute: now + 60000,
        hour: now + 3600000
      }
    };
  }

  /**
   * Record a rate limit violation
   */
  recordViolation(fingerprint, type, now) {
    const record = this.limits.get(fingerprint);
    if (!record) return;

    record.violations++;

    // Progressive blocking based on violation count
    if (record.violations >= 3) {
      const blockDuration = Math.min(
        3600000, // Max 1 hour
        1000 * Math.pow(2, record.violations - 3) // Exponential backoff
      );
      record.blocked = true;
      record.blockedUntil = now + blockDuration;
    }
  }

  /**
   * Get limits for specific route (with overrides)
   */
  getRouteLimits(routeKey = 'default') {
    const baseConfig = {
      requestsPerSecond: this.config.requestsPerSecond,
      requestsPerMinute: this.config.requestsPerMinute,
      requestsPerHour: this.config.requestsPerHour
    };

    // Apply route-specific overrides
    const override = this.config.routeOverrides[routeKey];
    if (override) {
      return { ...baseConfig, ...override };
    }

    return baseConfig;
  }

  /**
   * Reset limits for a fingerprint (admin use)
   */
  reset(fingerprint) {
    this.limits.delete(fingerprint);
  }

  /**
   * Get current status for a fingerprint
   */
  getStatus(fingerprint) {
    if (!this.limits.has(fingerprint)) {
      return {
        fingerprint,
        status: 'no_data',
        violations: 0,
        blocked: false
      };
    }

    const record = this.limits.get(fingerprint);
    const now = Date.now();

    return {
      fingerprint,
      status: record.blocked ? 'blocked' : 'active',
      violations: record.violations,
      blocked: record.blocked,
      blockedUntil: record.blocked ? new Date(record.blockedUntil).toISOString() : null,
      requestCount: record.requests.length,
      lastRequest: record.requests.length > 0 ? new Date(record.requests[record.requests.length - 1]).toISOString() : null
    };
  }

  /**
   * Cleanup old records periodically
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const maxAge = this.config.cleanupInterval;

      for (const [fingerprint, record] of this.limits.entries()) {
        // Remove if no activity for cleanup interval
        if (record.requests.length === 0 && now - record.lastReset > maxAge) {
          this.limits.delete(fingerprint);
        }
      }

      const remaining = this.limits.size;
      if (remaining > 1000) {
        console.warn(`[RateLimiter] High memory usage: ${remaining} fingerprints tracked`);
      }
    }, this.config.cleanupInterval);

    this.cleanupTimer.unref(); // Don't prevent process exit
  }

  /**
   * Stop cleanup timer
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalRequests = 0;
    let blockedCount = 0;
    let violationCount = 0;

    for (const record of this.limits.values()) {
      totalRequests += record.requests.length;
      if (record.blocked) blockedCount++;
      violationCount += record.violations;
    }

    return {
      trackedDevices: this.limits.size,
      totalRequests,
      blockedDevices: blockedCount,
      totalViolations: violationCount,
      memoryUsage: process.memoryUsage()
    };
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter({
  requestsPerSecond: 30, // Increased to support SPA concurrent requests on load
  requestsPerMinute: 600,
  requestsPerHour: 5000,
  burstAllowance: 1.5,
  routeOverrides: {
    'auth/login': { requestsPerSecond: 2, requestsPerMinute: 20 },
    'auth/register': { requestsPerSecond: 1, requestsPerMinute: 10 },
    'bulk-upsert': { requestsPerSecond: 5, requestsPerMinute: 50 },
    'read': { requestsPerSecond: 20, requestsPerMinute: 500 }
  }
});

/**
 * Express middleware for rate limiting
 */
export const rateLimitMiddleware = (options = {}) => {
  const {
    enabled = true,
    keyGenerator = (req) => getFingerprintKey(req),
    routeKeyGenerator = (req) => {
      if (req.originalUrl && req.originalUrl.includes('/auth/login')) return 'auth/login';
      if (req.originalUrl && req.originalUrl.includes('/auth/register')) return 'auth/register';
      if (req.originalUrl && req.originalUrl.includes('/bulk-upsert')) return 'bulk-upsert';
      return req.params.action || 'default';
    },
    skipCondition = (req) => false,
    onLimitExceeded = (req, res, limitStatus) => {
      // Default: return 429 Too Many Requests
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        reason: limitStatus.reason,
        retryAfter: limitStatus.retryAfter,
        violations: limitStatus.violations
      });
    }
  } = options;

  return (req, res, next) => {
    // Skip if disabled or condition met
    if (!enabled || skipCondition(req)) {
      return next();
    }

    const fingerprint = keyGenerator(req);
    const routeKey = routeKeyGenerator(req);

    // Check rate limit
    const limitStatus = rateLimiter.checkLimit(fingerprint, routeKey);

    // Attach info to request
    req.rateLimit = {
      fingerprint,
      status: limitStatus
    };

    // Add headers to response
    if (limitStatus.allowed) {
      const remaining = limitStatus.remaining;
      res.set('RateLimit-Limit-Second', String(rateLimiter.getRouteLimits(routeKey).requestsPerSecond));
      res.set('RateLimit-Remaining-Second', String(remaining.second));
      res.set('RateLimit-Reset-Second', String(Math.ceil(limitStatus.resetAt.second / 1000)));
      
      res.set('RateLimit-Limit-Minute', String(rateLimiter.getRouteLimits(routeKey).requestsPerMinute));
      res.set('RateLimit-Remaining-Minute', String(remaining.minute));
      res.set('RateLimit-Reset-Minute', String(Math.ceil(limitStatus.resetAt.minute / 1000)));
    } else {
      // Rate limited
      res.set('RateLimit-Reset', String(Math.ceil(limitStatus.retryAfter)));
      res.set('Retry-After', String(Math.ceil(limitStatus.retryAfter)));
      
      return onLimitExceeded(req, res, limitStatus);
    }

    next();
  };
};

export { rateLimiter };
export default rateLimiter;
