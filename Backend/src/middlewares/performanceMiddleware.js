import cacheService from '../services/cacheService.js';
import asyncNotificationService from '../services/asyncNotificationService.js';
import computationService from '../services/computationService.js';

// Cache middleware for GET requests
export const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `api:${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`,
    skipCache = (req) => req.query.nocache === 'true',
    cacheCondition = (req, res) => req.method === 'GET' && res.statusCode === 200
  } = options;

  return async (req, res, next) => {
    // Skip caching if condition not met
    if (!cacheCondition(req, res) || skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.json({
          ...cachedData,
          fromCache: true,
          cacheKey: process.env.NODE_ENV === 'development' ? cacheKey : undefined
        });
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode === 200 && data.success !== false) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Smart cache middleware with model-specific TTLs
export const smartCacheMiddleware = (req, res, next) => {
  const modelTTLs = {
    employees: 600,    // 10 minutes
    tasks: 300,        // 5 minutes
    attendances: 1800, // 30 minutes
    leaves: 600,       // 10 minutes
    notifications: 60, // 1 minute
    clients: 1800,     // 30 minutes
    departments: 3600, // 1 hour
    roles: 3600        // 1 hour
  };

  const model = req.params.model;
  const ttl = modelTTLs[model] || 300;
  
  const keyGenerator = (req) => {
    const { action, model, id } = req.params;
    const { type, page, limit, filter } = req.query;
    const userId = req.user?.id || 'anonymous';
    
    let key = `api:${action}:${model}`;
    if (id) key += `:${id}`;
    if (type) key += `:type=${type}`;
    if (page) key += `:page=${page}`;
    if (limit) key += `:limit=${limit}`;
    if (filter) key += `:filter=${Buffer.from(filter).toString('base64').slice(0, 20)}`;
    key += `:user=${userId}`;
    
    return key;
  };

  return cacheMiddleware({ ttl, keyGenerator })(req, res, next);
};

// Async processing middleware for heavy operations
export const asyncProcessingMiddleware = (req, res, next) => {
  // Add async helpers to request object
  req.async = {
    // Queue notification
    notify: async (userId, title, body, data = {}) => {
      return await asyncNotificationService.queuePushNotification(userId, title, body, data);
    },

    // Queue email
    email: async (to, subject, body, template = null) => {
      return await asyncNotificationService.queueEmail(to, subject, body, template);
    },

    // Queue computation
    compute: async (type, data, priority = 'normal') => {
      switch (type) {
        case 'monthly-report':
          return await computationService.queueMonthlyReport(
            data.employeeId, data.month, data.year, priority
          );
        case 'dashboard-stats':
          return await computationService.queueDashboardStats(
            data.userId, data.role, data.filters
          );
        default:
          throw new Error(`Unknown computation type: ${type}`);
      }
    }
  };

  next();
};

// Cache invalidation middleware
export const cacheInvalidationMiddleware = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Invalidate cache on successful write operations
    if (['create', 'update', 'delete'].includes(req.params.action) && 
        res.statusCode < 400 && data.success !== false) {
      
      const model = req.params.model;
      const patterns = [`api:read:${model}:*`, `api:*:${model}:*`];
      
      // Model-specific invalidation patterns
      if (model === 'employees') {
        patterns.push('stats:*', 'employee:list:*', 'user:profile:*');
      } else if (model === 'tasks') {
        patterns.push('stats:*', 'task:summary:*');
      } else if (model === 'attendances') {
        patterns.push('stats:*', 'attendance:daily:*');
      } else if (model === 'notifications') {
        patterns.push('notification:count:*');
      }

      // Invalidate caches asynchronously
      patterns.forEach(pattern => {
        cacheService.del(pattern).catch(err => {
          console.error('Cache invalidation error:', err);
        });
      });
    }
    
    return originalJson.call(this, data);
  };

  next();
};

// Response compression middleware
export const compressionMiddleware = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add compression headers for large responses
    const dataSize = JSON.stringify(data).length;
    
    if (dataSize > 10000) { // > 10KB
      res.set('Content-Encoding', 'gzip');
      res.set('X-Response-Size', dataSize);
    }
    
    // Add performance headers
    res.set('X-Response-Time', Date.now() - req.startTime);
    res.set('X-Cache-Status', data.fromCache ? 'HIT' : 'MISS');
    
    return originalJson.call(this, data);
  };

  // Track request start time
  req.startTime = Date.now();
  next();
};

// Rate limiting for expensive operations
export const rateLimitMiddleware = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    keyGenerator = (req) => req.user?.id || req.ip
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.push(now);
    next();
  };
};